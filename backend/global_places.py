"""现有地名与开放知识库服务；Foursquare 请求已禁用。"""
import hashlib
import html
import json
import math
import re
import unicodedata
import os
from pathlib import Path
import ssl
import threading
import time
from urllib.parse import urlencode, urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parent
CONTEXT = ssl.create_default_context(cafile='/etc/ssl/cert.pem' if Path('/etc/ssl/cert.pem').exists() else None)
# Vercel's application bundle is read-only; only /tmp is writable.
CACHE = Path('/tmp/pathly-cache') if os.environ.get('VERCEL') else ROOT / '.cache'
CACHE.mkdir(parents=True, exist_ok=True)
REQUEST_DEADLINE = threading.local()
LOCKS = {}
LOCK_GUARD = threading.Lock()
LAST_REQUESTS = {}
COOLDOWNS = {}
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


def get_json(url, headers=None, timeout=6):
    """缓存真实响应并串行限速；不缓存失败，不记录凭据，不自动重试扣额度请求。"""
    remaining=getattr(REQUEST_DEADLINE,'at',float('inf'))-time.monotonic()
    if remaining<=0:raise ApiError('UPSTREAM_TIMEOUT',504)
    timeout=min(timeout,remaining)
    cache = CACHE / (hashlib.sha256(url.encode()).hexdigest() + '.json')
    host = urlparse(url).hostname
    if host and ('foursquare.com' in host):
        raise ApiError('PROVIDER_DISABLED',410)
    with LOCK_GUARD:
        lock = LOCKS.setdefault(host, threading.Lock())
    # 缓存命中不排队；各数据源独立限速，图片服务不阻塞地点搜索。
    if cache.exists() and time.time() - cache.stat().st_mtime < (2592000 if host=='geocoding-api.open-meteo.com' else 604800):
        return json.loads(cache.read_text())
    if not lock.acquire(timeout=timeout): raise ApiError('UPSTREAM_BUSY',503)
    try:
        if time.monotonic()<COOLDOWNS.get(host,0): raise ApiError('UPSTREAM_429',429)
        if cache.exists() and time.time() - cache.stat().st_mtime < (2592000 if host=='geocoding-api.open-meteo.com' else 604800):
            return json.loads(cache.read_text())
        remaining=getattr(REQUEST_DEADLINE,'at',float('inf'))-time.monotonic()
        if remaining<=0:raise ApiError('UPSTREAM_TIMEOUT',504)
        timeout=min(timeout,remaining)
        time.sleep(max(0, 1.05 - (time.monotonic() - LAST_REQUESTS.get(host,0))))
        LAST_REQUESTS[host] = time.monotonic()
        try:
            req = Request(url, headers={'User-Agent': 'Pathly-MVP/1.0 (local travel planning)', 'Accept': 'application/json', **(headers or {})})
            with urlopen(req, timeout=timeout, context=CONTEXT) as response:
                data = json.load(response)
        except HTTPError as error:
            if error.code==429:
                try: delay=max(60,min(3600,int(error.headers.get('Retry-After','60'))))
                except (ValueError,TypeError): delay=60
                COOLDOWNS[host]=time.monotonic()+delay
            # 向浏览器只给状态，不透传任何可能带认证信息的上游正文。
            raise ApiError('UPSTREAM_' + str(error.code), error.code) from None
        except ApiError:
            raise
        except Exception:
            raise ApiError('UPSTREAM_UNAVAILABLE') from None
        cache.write_text(json.dumps(data, ensure_ascii=False))
        return data
    finally:
        lock.release()


def english_names(query, cities=False):
    # 用知识库多语言标签兼容中文别名，不维护城市/景点硬编码表。
    if not any('\u3400' <= c <= '\u9fff' for c in query):
        return [query]
    url = 'https://www.wikidata.org/w/api.php?' + urlencode({
        'action': 'wbsearchentities', 'search': query, 'language': 'zh-hans', 'uselang': 'en', 'format': 'json', 'limit': 6})
    data = get_json(url)
    hits = [p for p in data.get('search', []) if p.get('label') and 'fictional' not in p.get('description', '').lower()]
    if cities:
        city_hits = [p for p in hits if any(word in p.get('description', '').lower() for word in ['city', 'capital', 'town', 'municipality', 'district', 'prefecture', 'province', 'settlement'])]
        hits = city_hits or hits
    return list(dict.fromkeys(p['label'] for p in hits)) or [query]


def destinations(query):
    query = query.strip()
    if not query or len(query)>120: raise ApiError('INVALID_QUERY',400)
    pieces=re.split('[,，]',query,maxsplit=1)
    city_query=pieces[0].strip()
    country_hint=pieces[1].strip().casefold() if len(pieces)>1 else ''
    names=[city_query]
    try: names+=english_names(city_query,cities=True)[:2]
    except ApiError: pass  # 翻译服务失败仍尝试原始名称，避免整个目的地解析失败。
    found={}
    failures=0
    for name in dict.fromkeys(names):
        try:
            data=get_json('https://geocoding-api.open-meteo.com/v1/search?'+urlencode({'name':name,'count':8,'language':'en','format':'json'}))
        except ApiError:
            failures+=1
            continue
        try:
            translated=get_json('https://geocoding-api.open-meteo.com/v1/search?'+urlencode({'name':name,'count':8,'language':'zh','format':'json'}))
            chinese={p['id']:p for p in translated.get('results',[])}
        except ApiError: chinese={}
        for p in data.get('results',[]):
            if not p.get('country_code') or not p.get('feature_code','').startswith(('PPL','ADM')): continue
            zh=chinese.get(p['id'],{})
            if country_hint and country_hint not in {str(p.get('country','')).casefold(),str(p.get('country_code','')).casefold(),str(zh.get('country','')).casefold()}: continue
            found[p['id']]=dict(id=str(p['id']),name=p['name'],nameZh=zh.get('name'),displayName=zh.get('name') or p['name'],canonicalName=p['name'],regionZh=zh.get('admin1'),city=p['name'],country=p.get('country'),countryCode=p['country_code'],region=p.get('admin1'),latitude=p['latitude'],longitude=p['longitude'],population=p.get('population',0),source='geonames',coordinateSystem='WGS84',timezone=p.get('timezone'))
        if found: break
    if not found and failures==len(set(names)): raise ApiError('GEOCODER_UNAVAILABLE')
    return sorted(found.values(),key=lambda p:p['population'],reverse=True)


def distance_m(a, b):
    lat1, lat2 = math.radians(a[0]), math.radians(b[0])
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(math.radians(b[1]-a[1])/2)**2
    return 6371000 * 2 * math.asin(min(1, math.sqrt(h)))


def normalize_place(p, city):
    location = p.get('location') or {}
    return dict(id='foursquare-' + p['fsq_place_id'], source='foursquare', sourceId=p['fsq_place_id'],
        name=p['name'], nameLocal=None, nameEnglish=None, latitude=p['latitude'], longitude=p['longitude'],
        coordinateSystem='WGS84', country=None, countryCode=location.get('country'), region=location.get('region'),
        city=location.get('locality'), address=location.get('formatted_address') or location.get('address'),
        categories=[{'id': c.get('fsq_category_id'), 'name': c.get('name')} for c in p.get('categories', [])],
        website=p.get('website'), distance=p.get('distance'))


def search_places(params):
    # 本轮禁用旧提供方；不读取密钥，不发出任何 Foursquare 请求。
    raise ApiError('PROVIDER_DISABLED', 410)


def current_places(params):
    try:
        lat,lng=float(params['latitude']),float(params['longitude'])
        radius=float(params.get('radius',40000))
        if not (-90<=lat<=90 and -180<=lng<=180 and 0<radius<=100000): raise ValueError()
    except (KeyError,ValueError): raise ApiError('INVALID_COORDINATES',400)
    records=json.loads((ROOT/'data/current_places.json').read_text())
    query=params.get('query','').casefold().strip()
    result=[p for p in records if p.get('countryCode')==params.get('countryCode') and distance_m((lat,lng),(p['latitude'],p['longitude']))<=radius]
    if query: result=[p for p in result if query in p['name'].casefold()]
    from place_media import cached_media
    result=[{**p,**(cached_media(p) or {})} for p in result]
    return {'places':result,'source':'existing-snapshot','limited':True}


def localized_place(params, _entity_id=None, _wiki_checked=False):
    """只接受名称相关且坐标吻合的知识库中文名，不凭搜索首条猜译。"""
    full_name=params.get('name','').strip()
    name = full_name.split(' (')[0].strip()
    if not name or len(name) > 160:
        raise ApiError('INVALID_QUERY', 400)
    try:
        lat, lng = float(params['latitude']), float(params['longitude'])
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise ValueError()
    except (ValueError, KeyError):
        raise ApiError('INVALID_COORDINATES', 400)
    hits = get_json('https://www.wikidata.org/w/api.php?' + urlencode({
        'action':'wbsearchentities','search':params.get('_search_query',name),'language':'en','uselang':'en','format':'json','limit':6})).get('search', [])
    if _entity_id:
        hits=[{'id':_entity_id,'label':name}]
    ids = [h['id'] for h in hits if h.get('id')]
    if not ids:
        return alternate_name_media(params) if not _wiki_checked else {'nameZh':None,'photoStatus':'missing'}
    data = get_json('https://www.wikidata.org/w/api.php?' + urlencode({
        'action':'wbgetentities','ids':'|'.join(ids),'props':'labels|aliases|descriptions|claims','languages':'zh-hans|zh|zh-hant|en|ja|ko|fr|de|es|it|ar','format':'json'}))
    def normalized(text):
        text = unicodedata.normalize('NFKD', text.lower())
        text = text.replace('cathedral of ', '').replace(' de ', ' ').replace(' of ', ' ')
        return re.sub(r'[\W_]', '', text, flags=re.UNICODE)
    for hit in hits:
        entity = data.get('entities',{}).get(hit['id'],{})
        names=[hit.get('label',''),hit.get('match',{}).get('text','')]
        names += [v.get('value','') for v in entity.get('labels',{}).values()]
        names += [v.get('value','') for values in entity.get('aliases',{}).values() for v in values]
        if normalized(name) not in {normalized(value) for value in names}:
            continue
        description=entity.get('descriptions',{}).get('en',{}).get('value','').lower()
        # 同名街区不是公园照片；仅名字和近距离还不足以判定同一实体。
        if params.get('category','').lower() in ('park','parks') and any(x in description for x in ['neighborhood','neighbourhood','district','suburb']): continue
        for claim in entity.get('claims',{}).get('P625',[]):
            point = claim.get('mainsnak',{}).get('datavalue',{}).get('value',{})
            if point.get('latitude') is None or point.get('longitude') is None: continue
            if distance_m((lat,lng),(point['latitude'],point['longitude'])) > 350: continue
            labels=entity.get('labels',{})
            label=next((labels[k]['value'] for k in ['zh-hans','zh','zh-hant'] if k in labels),None)
            result = {'nameZh':label,'nameZhSource':'wikidata','nameZhSourceId':hit['id'], 'photoStatus':'missing'}
            # 图片与中文标签独立；同一实体没有中文名也可提供其真实照片。
            if params.get('image') == '1':
                images = entity.get('claims',{}).get('P18',[])
                for image in images[:3]:
                    if image.get('rank') == 'deprecated': continue
                    filename = image.get('mainsnak',{}).get('datavalue',{}).get('value')
                    if isinstance(filename,str):
                        try:
                            result['photo'] = commons_photo(filename)
                            if result['photo']:
                                result['photoStatus']='ready'
                                break
                        except ApiError: result['photoStatus']='error'
            return result
    if not _wiki_checked and params.get('city'):
        result=localized_place({**params,'_search_query':name+' '+params['city']}, _wiki_checked=True)
        if result.get('nameZhSourceId'): return result
    # 搜索排序可能只返回同名作品；用百科同名条目的实体补查，仍执行名称与坐标校验。
    if not _wiki_checked:
        wiki = get_json('https://en.wikipedia.org/w/api.php?' + urlencode({
            'action':'query','format':'json','titles':name,'redirects':1,'prop':'pageprops'}))
        for page in wiki.get('query',{}).get('pages',{}).values():
            qid=page.get('pageprops',{}).get('wikibase_item')
            if qid and qid not in ids:
                return localized_place(params, _entity_id=qid, _wiki_checked=True)
    return alternate_name_media(params) if not _wiki_checked else {'nameZh':None,'photoStatus':'missing'}

def alternate_name_media(params):
    # 使用源数据自带的当地名称，不维护城市或景点名称白名单。
    names=re.findall(r'[（(]([^()（）]+)[）)]',params.get('name',''))
    for name in names:
        if len(name)<3 or not any(ord(c)>127 for c in name): continue
        result=localized_place({**params,'name':name},_wiki_checked=True)
        if result.get('photo') or result.get('nameZhSourceId'): return result
    return {'nameZh':None,'photoStatus':'missing'}

def commons_photo(filename):
    data = get_json('https://commons.wikimedia.org/w/api.php?' + urlencode({
        'action':'query','format':'json','titles':'File:'+filename,'redirects':1,'prop':'imageinfo',
        'iiprop':'url|size|extmetadata','iiurlwidth':400,'iiextmetadatafilter':'Artist|Attribution|LicenseShortName|LicenseUrl'}))
    for page in data.get('query',{}).get('pages',{}).values():
        for info in page.get('imageinfo',[]):
            meta = info.get('extmetadata',{})
            clean = lambda key: html.unescape(re.sub('<[^>]+>','',meta.get(key,{}).get('value',''))).strip()
            license_name = clean('LicenseShortName')
            author = clean('Attribution') or clean('Artist')
            url = info.get('thumburl','')
            # 只使用明确带来源和许可的 Commons 图，不插入第三方 HTML。
            if url.startswith(('https://upload.wikimedia.org/', 'https://thumb.wikimedia.org/')) and author and license_name:
                original=info.get('url','')
                fallback=original if original.startswith('https://upload.wikimedia.org/') and 0 < info.get('size',0) <= 5_000_000 else None
                return {'url':url,'fallbackUrl':fallback,'page':info.get('descriptionurl'),'author':author,'license':license_name,'source':'wikimedia-commons'}
    return None
