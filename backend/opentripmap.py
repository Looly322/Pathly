"""官方 OpenTripMap 代理：串行限速、持久缓存、脱敏错误、有限预算。"""
import settings
import os,json,time,hashlib,threading,re,unicodedata
from datetime import datetime,timezone
from urllib.parse import urlencode,quote,unquote,urlparse
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from global_places import CACHE,CONTEXT,ApiError,distance_m,commons_photo
ROOT=CACHE/'opentripmap';ROOT.mkdir(exist_ok=True)
LOCK=threading.Lock();last=0;cooldown=0

def request(path,params=None,ttl=86400):
    global last,cooldown
    if path not in ('radius','geoname') and not re.fullmatch(r'xid/[A-Za-z0-9_-]+',path):raise ApiError('OTM_INVALID_PATH',400)
    key=os.environ.get('OPEN_TRIP_MAP_API_KEY','')
    if not key:raise ApiError('OTM_KEY_MISSING',503)
    params=params or {}; cache=ROOT/(hashlib.sha256(json.dumps([path,params],sort_keys=True).encode()).hexdigest()+'.json')
    with LOCK:
        if cache.exists() and time.time()-cache.stat().st_mtime<ttl:return json.loads(cache.read_text())
        if time.time()<cooldown:raise ApiError('OTM_RATE_LIMITED',429)
        for attempt in range(2):
            # 本地保守预算，不把它宣称为账户实际免费额度。跨重启保留计数。
            usage=ROOT/'usage.json';day=datetime.now(timezone.utc).date().isoformat()
            record=json.loads(usage.read_text()) if usage.exists() else {}
            count=record.get('count',0) if record.get('day')==day else 0
            if count>=200:raise ApiError('OTM_LOCAL_DAILY_BUDGET',429)
            time.sleep(max(0,1.1-(time.monotonic()-last)));last=time.monotonic()
            usage.write_text(json.dumps({'day':day,'count':count+1}))
            url='https://api.opentripmap.com/0.1/en/places/'+path+'?'+urlencode({**params,'apikey':key})
            try:
                with urlopen(Request(url,headers={'Accept':'application/json','User-Agent':'Pathly/1.0'}),context=CONTEXT,timeout=15) as response:data=json.load(response)
                if isinstance(data,dict) and data.get('error'):raise ApiError('OTM_API_ERROR',502)
                cache.write_text(json.dumps(data,ensure_ascii=False));return data
            except HTTPError as e:
                if e.code in (401,403):raise ApiError('OTM_AUTH_'+str(e.code),e.code) from None
                if e.code==429:
                    try:delay=max(60,min(3600,int(e.headers.get('Retry-After','60'))))
                    except ValueError:delay=60
                    cooldown=time.time()+delay;raise ApiError('OTM_RATE_LIMITED',429) from None
                if e.code<500 or attempt:raise ApiError('OTM_HTTP_'+str(e.code),502) from None
            except ApiError:raise
            except Exception:
                if attempt:raise ApiError('OTM_NETWORK_UNAVAILABLE',502) from None
            time.sleep(2)

def classify(kinds):
    kinds=set(kinds.split(','))
    for group,tags,category,interests,duration in [
        ('MUSEUM',{'museums'},'CULTURE',['CULTURE'],150),
        ('ART',{'art_galleries','theatres_and_entertainments','sculptures'},'ART',['ART','CULTURE'],90),
        ('HISTORY',{'historic','archaeology','fortifications','castles'},'CULTURE',['CULTURE'],120),
        ('CULTURE',{'religion','churches','mosques','synagogues','buddhist_temples','architecture'},'CULTURE',['CULTURE'],90),
        ('NATURE',{'natural','gardens_and_parks','national_parks','nature_reserves'},'NATURE',['NATURE'],100),
        ('CITY_WALK',{'urban_environment','squares','historic_districts'},'CITY_WALK',['CITY_WALK','CULTURE'],60)]:
        if tags&kinds:return group,category,interests,duration
    return 'LANDMARK','ATTRACTION',['CITY_WALK'],60

def dedupe(places):
    result=[];ids=set();refs=set()
    for p in places:
        ref=p.get('wikidata') or p.get('osm');name=re.sub(r'\W','',unicodedata.normalize('NFKC',p['name']).casefold())
        if p['id'] in ids or (ref and ref in refs):continue
        if any(name==re.sub(r'\W','',unicodedata.normalize('NFKC',q['name']).casefold()) and distance_m((p['latitude'],p['longitude']),(q['latitude'],q['longitude']))<150 for q in result):continue
        ids.add(p['id']);refs.add(ref) if ref else None;result.append(p)
    return result

def search(params):
    try:
        lat,lon=float(params['latitude']),float(params['longitude'])
        if not(-90<=lat<=90 and -180<=lon<=180):raise ValueError()
    except (KeyError,ValueError,TypeError):raise ApiError('INVALID_COORDINATES',400)
    places=[];radii=[];wanted=set(params.get('interests','').split(','))
    for radius in (4000,8000,15000):
        rows=request('radius',{'lat':lat,'lon':lon,'radius':radius,'kinds':'interesting_places','format':'json','limit':150,'rate':1});radii.append(radius)
        for row in rows:
            point=row.get('point',{});name=row.get('name','').strip();a,b=point.get('lat'),point.get('lon');xid=row.get('xid')
            if not xid or not name or a is None or b is None:continue
            km=distance_m((lat,lon),(a,b))/1000
            if km>radius/1000:continue
            group,category,interests,duration=classify(row.get('kinds',''))
            quality=int(row.get('rate',1));quality=min(3,max(1,quality%4 or 1))
            places.append(dict(id='otm-'+xid,source='opentripmap',sourceId=xid,name=name,latitude=a,longitude=b,coordinateSystem='WGS84',
                city=params.get('city'),countryCode=params.get('countryCode'),category=category,subcategories=interests,poiCategory=group,
                estimatedDuration=duration,minimumDuration=round(duration*.8),quality=quality,distanceFromCenter=round(km,2),isOutskirts=km>8,
                categories=[{'name':group}],wikidata=row.get('wikidata'),osm=row.get('osm'),image=None,price=None))
        places=dedupe(places)
        if len(places)>=30 and (not wanted or all(any(i in p['subcategories'] for p in places) for i in wanted-{'FOOD','SHOPPING'})):break
    # 每类轮流抽样：保留多样性，不按 API 返回顺序截断。
    places.sort(key=lambda p: (len(wanted&set(p['subcategories']))*4+p['quality']*2-p['distanceFromCenter']*.3),reverse=True)
    groups={}
    for p in places:groups.setdefault(p['poiCategory'],[]).append(p)
    selected=[]
    while groups and len(selected)<60:
        for group in list(groups):
            selected.append(groups[group].pop(0))
            if not groups[group]:del groups[group]
            if len(selected)==60:break
    return {'places':selected,'radii':radii,'totalValid':len(places),'source':'opentripmap'}

def details(xid):
    if not re.fullmatch('[A-Za-z0-9_-]{1,100}',xid):raise ApiError('INVALID_XID',400)
    raw=request('xid/'+xid,ttl=604800)
    result={'description':raw.get('wikipedia_extracts',{}).get('text') or raw.get('info',{}).get('descr'),
        'website':raw.get('url'),'sourceUrl':raw.get('otm'),'photoStatus':'missing','photo':None}
    # OTM 图片关联到此 xid；只显示能从 Commons 确认作者、许可证的图片。
    image=raw.get('image','')
    if 'commons.wikimedia.org'==urlparse(image).hostname:
        filename=unquote(urlparse(image).path).split('File:')[-1]
        if filename and len(filename)<240:
            try:result['photo']=commons_photo(filename)
            except ApiError:result['photoStatus']='error'
    if result['photo']:result['photoStatus']='ready'
    return result
