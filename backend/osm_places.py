"""按旅行目的地获取 OSM 真实地点；固定公共端点、有限范围、复用响应缓存。"""
from urllib.parse import urlencode
import math
import math
from global_places import get_json, ApiError, distance_m

FILTERS=[('tourism','museum|gallery|attraction|viewpoint|zoo|aquarium'),('historic','monument|memorial|castle|ruins|archaeological_site'),('leisure','park|garden'),('amenity','restaurant|marketplace|theatre'),('shop','mall|department_store')]

def search_osm(params):
    try:
        lat,lng=float(params['latitude']),float(params['longitude'])
        if not(-90<=lat<=90 and -180<=lng<=180):raise ValueError()
    except (KeyError,ValueError,TypeError):raise ApiError('INVALID_COORDINATES',400)
    # 各类别独立限量，避免餐厅数量淹没景点；不接收用户拼接的 Overpass 语句。
    dy=0.055;dx=min(1,dy/max(.05,math.cos(math.radians(lat))))
    bounds=f'{max(-90,lat-dy):.5f},{max(-180,lng-dx):.5f},{min(90,lat+dy):.5f},{min(180,lng+dx):.5f}'
    query='[out:json][timeout:15];'+''.join(f'nwr({bounds})[name]["{key}"~"^({values})$"];out center 35;' for key,values in FILTERS)
    data=get_json('https://overpass-api.de/api/interpreter?'+urlencode({'data':query}))
    if data.get('remark'):raise ApiError('PLACE_QUERY_INCOMPLETE')
    places=[];seen=set()
    for item in data.get('elements',[]):
        tags=item.get('tags',{});point=item.get('center',item);name=tags.get('name')
        a,b=point.get('lat'),point.get('lon')
        if not name or a is None or b is None or distance_m((lat,lng),(a,b))>8000:continue
        duplicate=(name.casefold(),round(a,3),round(b,3))
        if duplicate in seen:continue
        seen.add(duplicate)
        categories=[{'name':tags[key].replace('_',' ')} for key,_ in FILTERS if key in tags]
        source_id=f"{item['type']}/{item['id']}"
        places.append(dict(id='osm-'+source_id.replace('/','-'),source='openstreetmap',sourceId=source_id,
            name=name,nameZh=tags.get('name:zh-Hans') or tags.get('name:zh'),nameEnglish=tags.get('name:en'),
            latitude=a,longitude=b,coordinateSystem='WGS84',city=tags.get('addr:city') or params.get('city'),
            countryCode=tags.get('addr:country'),categories=categories,
            address=' '.join(filter(None,[tags.get('addr:street'),tags.get('addr:housenumber')])),
            website=tags.get('website') or tags.get('contact:website'),sourceUrl='https://www.openstreetmap.org/'+source_id,
            openingHoursText=tags.get('opening_hours'),tourism=tags.get('tourism'),leisure=tags.get('leisure'),boundary=tags.get('boundary'),
            wikidata=tags.get('wikidata'),commonsFile=tags.get('wikimedia_commons') if tags.get('wikimedia_commons','').startswith('File:') else None,image=None))
    return {'places':places,'source':'openstreetmap','attribution':'© OpenStreetMap contributors · ODbL','radius':8000}
def search_named(params):
    """User-triggered hotel/restaurant lookup; bounded query, no inferred branches."""
    import json, re
    try:lat,lng=float(params['latitude']),float(params['longitude'])
    except (KeyError,ValueError,TypeError):raise ApiError('INVALID_COORDINATES',400)
    name=params.get('query','').strip();kind=params.get('kind')
    if not(-90<=lat<=90 and -180<=lng<=180) or not 2<=len(name)<=120 or kind not in ('hotel','restaurant'):
        raise ApiError('INVALID_QUERY',400)
    tag='["tourism"~"^(hotel|hostel|guest_house|apartment)$"]' if kind=='hotel' else '["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]'
    pattern=json.dumps(re.escape(name),ensure_ascii=False)
    q='[out:json][timeout:18];('+''.join(f'nwr(around:25000,{lat},{lng}){tag}["{key}"~{pattern},i];' for key in ['name','name:en','name:zh','name:ja','alt_name','brand'])+');out center tags 20;'
    try:data=get_json('https://overpass-api.de/api/interpreter?'+urlencode({'data':q}),timeout=10)
    except ApiError as error:
        if error.status in (400,403,429):raise
        data=get_json('https://overpass.private.coffee/api/interpreter?'+urlencode({'data':q}),timeout=12)
    if data.get('remark'):raise ApiError('PLACE_QUERY_INCOMPLETE')
    places=[]
    for e in data.get('elements',[]):
        t=e.get('tags',{});p=e.get('center',e)
        if not t.get('name') or p.get('lat') is None or p.get('lon') is None:continue
        identity=f"{e['type']}/{e['id']}"
        places.append(dict(id='osm-'+identity.replace('/','-'),sourceId=identity,source='openstreetmap',name=t['name'],nameEnglish=t.get('name:en'),nameZh=t.get('name:zh'),latitude=p['lat'],longitude=p['lon'],coordinateSystem='WGS84',city=params.get('city'),countryCode=params.get('countryCode'),address=' '.join(filter(None,[t.get('addr:city'),t.get('addr:street'),t.get('addr:housenumber')])),categories=[{'name':kind}],openingHoursText=t.get('opening_hours'),website=t.get('website'),sourceUrl='https://www.openstreetmap.org/'+identity))
    return {'places':places,'attribution':'© OpenStreetMap contributors · ODbL'}
