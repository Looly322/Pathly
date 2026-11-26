"""全球地点代理：仅允许 Foursquare Search 的 Pro 基础字段，不调用详情/Premium。"""
import hashlib
import json
import math
import os
from pathlib import Path
import ssl
import threading
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parent
for line in (ROOT / '.env').read_text().splitlines() if (ROOT / '.env').exists() else []:
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('\"\''))
CONTEXT = ssl.create_default_context(cafile='/etc/ssl/cert.pem' if Path('/etc/ssl/cert.pem').exists() else None)
CACHE = ROOT / '.cache'
CACHE.mkdir(exist_ok=True)
LOCK = threading.Lock()
LAST_REQUEST = 0
PRO_FIELDS = 'fsq_place_id,name,latitude,longitude,location,categories,website,distance'
# Foursquare 的分类 ID；分类范围与实际返回 categories 一起展示。
CATEGORIES = {
    'attractions': '4d4b7105d754a06377d81259',
    'museums': '4bf58dd8d48988d181941735',
    'parks': '4bf58dd8d48988d163941735',
    'landmarks': '4deefb944765f83613cdba6e',
    'restaurants': '4d4b7105d754a06374d81259',
    'coffee': '4bf58dd8d48988d1e0931735',
    'shopping': '4d4b7105d754a06378d81259',
    'entertainment': '4d4b7104d754a06370d81259',
}

class ApiError(Exception):
    def __init__(self, code, status=502):
        super().__init__(code)
        self.status = status


def get_json(url, headers=None):
    """缓存真实响应并串行限速；不缓存失败，不记录凭据，不自动重试扣额度请求。"""
    global LAST_REQUEST
    cache = CACHE / (hashlib.sha256(url.encode()).hexdigest() + '.json')
    with LOCK:
        if cache.exists() and time.time() - cache.stat().st_mtime < 86400:
            return json.loads(cache.read_text())
        time.sleep(max(0, 1.05 - (time.monotonic() - LAST_REQUEST)))
        LAST_REQUEST = time.monotonic()
        try:
            req = Request(url, headers={'User-Agent': 'Pathly-MVP/1.0 (local travel planning)', 'Accept': 'application/json', **(headers or {})})
            with urlopen(req, timeout=20, context=CONTEXT) as response:
                data = json.load(response)
        except HTTPError as error:
            # 向浏览器只给状态，不透传任何可能带认证信息的上游正文。
            raise ApiError('UPSTREAM_' + str(error.code), error.code) from None
        except Exception:
            raise ApiError('UPSTREAM_UNAVAILABLE') from None
        cache.write_text(json.dumps(data, ensure_ascii=False))
        return data


def english_names(query):
    # 用知识库多语言标签兼容中文别名，不维护城市/景点硬编码表。
    if not any('\u3400' <= c <= '\u9fff' for c in query):
        return [query]
    url = 'https://www.wikidata.org/w/api.php?' + urlencode({
        'action': 'wbsearchentities', 'search': query, 'language': 'zh', 'uselang': 'en', 'format': 'json', 'limit': 3})
    data = get_json(url)
    return list(dict.fromkeys([p['label'] for p in data.get('search', []) if p.get('label')])) or [query]


def destinations(query):
    query = query.strip()
    if not query or len(query) > 120:
        raise ApiError('INVALID_QUERY', 400)
    names = english_names(query)
    found = {}
    for name in names[:2]:
        data = get_json('https://geocoding-api.open-meteo.com/v1/search?' + urlencode({
            'name': name, 'count': 8, 'language': 'en', 'format': 'json'}))
        for p in data.get('results', []):
            if not p.get('country_code') or not p.get('feature_code', '').startswith(('PPL', 'ADM')):
                continue
            found[p['id']] = dict(id=str(p['id']), name=p['name'], city=p['name'], country=p.get('country'),
                countryCode=p['country_code'], region=p.get('admin1'), latitude=p['latitude'], longitude=p['longitude'],
                population=p.get('population', 0), source='geonames', timezone=p.get('timezone'))
        if found:
            break
    return sorted(found.values(), key=lambda p: p['population'], reverse=True)


def distance_m(a, b):
    lat1, lat2 = math.radians(a[0]), math.radians(b[0])
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(math.radians(b[1]-a[1])/2)**2
    return 6371000 * 2 * math.asin(min(1, math.sqrt(h)))


def normalize_place(p, city):
    location = p.get('location') or {}
    return dict(id='foursquare-' + p['fsq_place_id'], source='foursquare', sourceId=p['fsq_place_id'],
        name=p['name'], nameLocal=None, nameEnglish=None, latitude=p['latitude'], longitude=p['longitude'],
        country=None, countryCode=location.get('country'), region=location.get('region'),
        city=location.get('locality'), address=location.get('formatted_address') or location.get('address'),
        categories=[{'id': c.get('fsq_category_id'), 'name': c.get('name')} for c in p.get('categories', [])],
        website=p.get('website'), distance=p.get('distance'))


def search_places(params):
    try:
        lat, lng = float(params['latitude']), float(params['longitude'])
        radius, limit = int(params.get('radius', 15000)), int(params.get('limit', 10))
        assert math.isfinite(lat) and math.isfinite(lng) and -90 <= lat <= 90 and -180 <= lng <= 180
        assert 1 <= radius <= 50000 and 1 <= limit <= 20
    except (KeyError, ValueError, AssertionError):
        raise ApiError('INVALID_COORDINATES', 400) from None
    category = params.get('category', '')
    if category and category not in CATEGORIES:
        raise ApiError('INVALID_CATEGORY', 400)
    query = params.get('query', '').strip()
    if len(query) > 160:
        raise ApiError('INVALID_QUERY', 400)
    key = os.environ.get('FOURSQUARE_API_KEY')
    if not key:
        raise ApiError('FOURSQUARE_NOT_CONFIGURED', 503)
    translated = english_names(query)[0] if query else ''
    request = dict(ll=f'{lat},{lng}', radius=radius, limit=limit, fields=PRO_FIELDS)
    if translated:
        request['query'] = translated
    if category:
        request['fsq_category_ids'] = CATEGORIES[category]
    # 固定域名、固定 endpoint 和字段白名单；不接受前端传入 fields、URL 或授权头。
    data = get_json('https://places-api.foursquare.com/places/search?' + urlencode(request), {
        'Authorization': 'Bearer ' + key, 'X-Places-Api-Version': '2025-06-17'})
    places = []
    for p in data.get('results', []):
        if not p.get('fsq_place_id') or not p.get('name') or p.get('latitude') is None or p.get('longitude') is None:
            continue
        if distance_m((lat,lng), (p['latitude'],p['longitude'])) > radius:
            continue
        if params.get('countryCode') and p.get('location', {}).get('country') != params['countryCode']:
            continue
        places.append(normalize_place(p, params.get('city')))
    return {'places': places, 'queryUsed': translated, 'source': 'foursquare'}
