"""官方 OpenTripMap 代理：串行限速、持久缓存、脱敏错误、有限预算。"""
import settings
import os,json,time,hashlib,threading,re,unicodedata
from datetime import datetime,timezone
from contextlib import contextmanager
from urllib.parse import urlencode,quote,unquote,urlparse
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from global_places import CACHE,CONTEXT,ApiError,distance_m,commons_photo,get_json
ROOT=CACHE/'opentripmap';ROOT.mkdir(exist_ok=True)
LOCK=threading.Lock();last=0;cooldown=0

def request(path,params=None,ttl=86400):
    global last,cooldown
    if path not in ('radius','geoname') and not re.fullmatch(r'xid/[A-Za-z0-9_-]+',path):raise ApiError('OTM_INVALID_PATH',400)
    key=os.environ.get('OPEN_TRIP_MAP_API_KEY','')
    if not key:raise ApiError('OTM_KEY_MISSING',503)
    params=params or {}; cache=ROOT/(hashlib.sha256(json.dumps([path,params],sort_keys=True).encode()).hexdigest()+'.json')
    if cache.exists() and time.time()-cache.stat().st_mtime<ttl:return json.loads(cache.read_text())
    if not LOCK.acquire(timeout=5):raise ApiError('OTM_BUSY',503)
    try:
        if cache.exists() and time.time()-cache.stat().st_mtime<ttl:return json.loads(cache.read_text())
        if time.time()<cooldown:raise ApiError('OTM_RATE_LIMITED',429)
        for attempt in range(1):
            # 本地保守预算，不把它宣称为账户实际免费额度。跨重启保留计数。
            usage=ROOT/'usage.json';day=datetime.now(timezone.utc).date().isoformat()
            record=json.loads(usage.read_text()) if usage.exists() else {}
            count=record.get('count',0) if record.get('day')==day else 0
            if count>=200:raise ApiError('OTM_LOCAL_DAILY_BUDGET',429)
            time.sleep(max(0,1.1-(time.monotonic()-last)));last=time.monotonic()
            usage.write_text(json.dumps({'day':day,'count':count+1}))
            url='https://api.opentripmap.com/0.1/en/places/'+path+'?'+urlencode({**params,'apikey':key})
            try:
                with urlopen(Request(url,headers={'Accept':'application/json','User-Agent':'Pathly/1.0'}),context=CONTEXT,timeout=7) as response:data=json.load(response)
                if isinstance(data,dict) and data.get('error'):raise ApiError('OTM_API_ERROR',502)
                cache.write_text(json.dumps(data,ensure_ascii=False));return data
            except HTTPError as e:
                if e.code in (401,403):raise ApiError('OTM_AUTH_'+str(e.code),e.code) from None
                if e.code==429:
                    try:delay=max(60,min(3600,int(e.headers.get('Retry-After','60'))))
                    except ValueError:delay=60
                    cooldown=time.time()+delay;raise ApiError('OTM_RATE_LIMITED',429) from None
                if e.code<500 or attempt==0:raise ApiError('OTM_HTTP_'+str(e.code),502) from None
            except ApiError:raise
            except Exception:
                if attempt==0:raise ApiError('OTM_NETWORK_UNAVAILABLE',502) from None
            time.sleep(2)
    finally:
        LOCK.release()

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
        if any(p.get('featureType') and p.get('featureType')==q.get('featureType') and distance_m((p['latitude'],p['longitude']),(q['latitude'],q['longitude']))<30 for q in result):continue
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
        # 先补足资料价值较高的地点，避免附近小建筑占满默认结果。
        rows=request('radius',{'lat':lat,'lon':lon,'radius':radius,'kinds':'interesting_places','format':'json','limit':60,'rate':3})+rows
        if 'NATURE' in wanted:
            # 自然景观单独补查，避免城市中心的建筑数量挤掉公园。
            rows+=request('radius',{'lat':lat,'lon':lon,'radius':radius,'kinds':'natural,gardens_and_parks','format':'json','limit':50,'rate':1})
        for row in rows:
            point=row.get('point',{});name=row.get('name','').strip();a,b=point.get('lat'),point.get('lon');xid=row.get('xid')
            if not xid or not name or a is None or b is None:continue
            if not(-90<=a<=90 and -180<=b<=180):continue
            if re.search(r'\b(hotel|hostel|hospital|parking|toilet|ticket office)\b',name,re.I):continue
            km=distance_m((lat,lon),(a,b))/1000
            if km>radius/1000:continue
            group,category,interests,duration=classify(row.get('kinds',''))
            rate=int(row.get('rate',1));quality=rate;quality=min(3,max(1,quality%4 or 1))
            places.append(dict(id='otm-'+xid,source='opentripmap',sourceId=xid,name=name,latitude=a,longitude=b,coordinateSystem='WGS84',
                city=params.get('city'),countryCode=params.get('countryCode'),category=category,subcategories=interests,poiCategory=group,
                estimatedDuration=duration,minimumDuration=round(duration*.8),quality=quality,distanceFromCenter=round(km,2),isOutskirts=km>8,
                featureType=next((k for k in ['fountains','waterfalls','monuments','churches','mosques'] if k in row.get('kinds','').split(',')),None),heritage=rate>=4,
                categories=[{'name':group}],wikidata=row.get('wikidata'),osm=row.get('osm'),image=None,price=None))
        places=dedupe(places)
        if len(places)>=30 and (not wanted or all(any(i in p['subcategories'] for p in places) for i in wanted-{'FOOD','SHOPPING'})):break
    # 每类轮流抽样：保留多样性，不按 API 返回顺序截断。
    places.sort(key=lambda p: (len(wanted&set(p['subcategories']))*4+p['quality']*2+(6 if p.get('heritage') else 0)-p['distanceFromCenter']*.3),reverse=True)
    groups={}
    for p in places:groups.setdefault(p['poiCategory'],[]).append(p)
    selected=[]
    while groups and len(selected)<60:
        for group in list(groups):
            selected.append(groups[group].pop(0))
            if not groups[group]:del groups[group]
            if len(selected)==60:break
    selected=exclude_demolished(selected)
    return {'places':selected,'radii':radii,'totalValid':len(places),'source':'opentripmap','searchArea':{'latitude':lat,'longitude':lon,'radiusMeters':radii[-1],'administrativeBoundary':False}}

def exclude_demolished(places):
    # 批量核对已有 Wikidata 关联，排除已经拆除的普通建筑；遗址类别仍保留。
    qids=list(dict.fromkeys(p['wikidata'] for p in places if re.fullmatch(r'Q[0-9]+',p.get('wikidata') or '')))
    demolished=set()
    for start in range(0,len(qids),50):
        try:
            data=get_json('https://www.wikidata.org/w/api.php?'+urlencode({'action':'wbgetentities','ids':'|'.join(qids[start:start+50]),'props':'claims','format':'json'}))
            demolished.update(q for q,e in data.get('entities',{}).items() if e.get('claims',{}).get('P576'))
        except ApiError:pass
    return [p for p in places if p.get('wikidata') not in demolished or p['poiCategory']=='HISTORY']

DETAIL_LOCK=threading.Lock()
DETAIL_KEYS={}
def detail_lock(key):
    with DETAIL_LOCK:return DETAIL_KEYS.setdefault(key,threading.Lock())
@contextmanager
def bounded_detail_lock(key):
    lock=detail_lock(key)
    if not lock.acquire(timeout=2):raise ApiError('DETAIL_BUSY',503)
    try:yield
    finally:lock.release()

def photo_details(xid):
    if not re.fullmatch('[A-Za-z0-9_-]{1,100}',xid):raise ApiError('INVALID_XID',400)
    cache=ROOT/('presentation-v2-'+xid+'.json')
    with bounded_detail_lock(xid):
        if cache.exists() and time.time()-cache.stat().st_mtime<600:return json.loads(cache.read_text())
        raw=request('xid/'+xid,ttl=604800)
        result={'description':(raw.get('wikipedia_extracts') or {}).get('text') or (raw.get('info') or {}).get('descr'),
            'website':raw.get('url'),'sourceUrl':raw.get('otm'),'photoStatus':'missing','photo':None}
        filenames=[];image=raw.get('image') or ''
        if urlparse(image).hostname=='commons.wikimedia.org' and 'File:' in image:
            filenames.append(unquote(urlparse(image).path).split('File:')[-1])
        # 只通过 xid 已有关联的 Wikidata / Wikipedia 找图，不用名称首个搜索结果。
        qid=raw.get('wikidata','')
        if re.fullmatch(r'Q[0-9]+',qid):
            try:
                entity=get_json('https://www.wikidata.org/w/api.php?'+urlencode({'action':'wbgetentities','ids':qid,'props':'labels|claims','languages':'zh-hans|zh|en','format':'json'})).get('entities',{}).get(qid,{})
                labels=entity.get('labels',{});result['nameZh']=next((labels[k]['value'] for k in ['zh-hans','zh'] if k in labels),None)
                coordinates=[c.get('mainsnak',{}).get('datavalue',{}).get('value',{}) for c in entity.get('claims',{}).get('P625',[])]
                point=raw.get('point',{})
                matched=any('latitude' in c and 'lat' in point and distance_m((c['latitude'],c['longitude']),(point['lat'],point['lon']))<750 for c in coordinates)
                for claim in (entity.get('claims',{}).get('P18',[])[:2] if matched else []):
                    value=claim.get('mainsnak',{}).get('datavalue',{}).get('value')
                    if isinstance(value,str):filenames.append(value)
            except ApiError:pass
        for filename in dict.fromkeys(filenames):
            if len(filename)>240:continue
            try:
                result['photo']=commons_photo(filename)
                if result['photo']:break
            except ApiError:result['photoStatus']='error'
        wiki=urlparse(raw.get('wikipedia') or '')
        if not result['photo'] and re.fullmatch(r'[a-z-]+\.wikipedia\.org',wiki.hostname or '') and wiki.path.startswith('/wiki/'):
            try:
                data=get_json('https://'+wiki.hostname+'/w/api.php?'+urlencode({'action':'query','format':'json','titles':unquote(wiki.path[6:]),'redirects':1,'prop':'pageimages','piprop':'original'}))
                for page in data.get('query',{}).get('pages',{}).values():
                    url=page.get('original',{}).get('source','')
                    if urlparse(url).hostname=='upload.wikimedia.org':
                        result['photo']=commons_photo(unquote(urlparse(url).path.split('/')[-1]))
                        if result['photo']:break
            except ApiError:result['photoStatus']='error'
        if result['photo']:
            result['photoStatus']='ready'
        if result.get('description'):result['description']=result['description'][:900]
        cache.write_text(json.dumps(result,ensure_ascii=False))
        return result

def resolve_destinations(query):
    from global_places import destinations,english_names
    if not query.strip() or len(query)>120:raise ApiError('INVALID_QUERY',400)
    try:
        found=destinations(query)
        if found:return found
    except ApiError:pass
    pieces=re.split('[,，]',query,maxsplit=1);name=pieces[0].strip()
    if len(pieces)>1 and not re.fullmatch('[A-Za-z]{2}',pieces[1].strip()):return []
    try:names=english_names(name,cities=True)[:2]
    except ApiError:names=[name]
    for translated in names:
        params={'name':translated}
        if len(pieces)>1:params['country']=pieces[1].strip().upper()
        data=request('geoname',params)
        if data.get('status')!='OK':continue
        return [dict(id='otm-city-'+str(data.get('geoname_id') or str(data['lat'])+','+str(data['lon'])),
            name=data['name'],displayName=name,canonicalName=data['name'],city=data['name'],country=data.get('country'),countryCode=data.get('country'),
            region='',latitude=data['lat'],longitude=data['lon'],source='opentripmap-geoname',coordinateSystem='WGS84')]
    return []


def details(xid,part='all'):
    """文字与图片分开请求：图片失败不阻塞原文、官网与可靠译名。"""
    if not re.fullmatch('[A-Za-z0-9_-]{1,100}',xid):raise ApiError('INVALID_XID',400)
    if part not in ('all','base','text','photo'):raise ApiError('INVALID_PART',400)
    if part in ('all','photo'):return photo_details(xid)
    raw=request('xid/'+xid,ttl=604800)
    result={'description':(raw.get('wikipedia_extracts') or {}).get('text') or (raw.get('info') or {}).get('descr'),
        'descriptionLanguage':(urlparse(raw.get('wikipedia') or '').hostname or 'en').split('.')[0],'website':raw.get('url'),'sourceUrl':raw.get('wikipedia') or raw.get('otm')}
    if part=='base':return result
    qid=raw.get('wikidata','')
    if not re.fullmatch(r'Q[0-9]+',qid):return result
    # xid 自带关联，不做名称模糊搜索，避免同名地点误配。
    entity=get_json('https://www.wikidata.org/w/api.php?'+urlencode({'action':'wbgetentities','ids':qid,'props':'labels|descriptions','languages':'zh-hans|zh|en','format':'json'})).get('entities',{}).get(qid,{})
    labels=entity.get('labels',{});descriptions=entity.get('descriptions',{})
    result['nameZh']=next((labels[k]['value'] for k in ('zh-hans','zh') if k in labels),None)
    result['nameEnglish']=labels.get('en',{}).get('value')
    result['descriptionZh']=next((descriptions[k]['value'] for k in ('zh-hans','zh') if k in descriptions),None)
    result['descriptionZhSource']='https://www.wikidata.org/wiki/'+qid
    return result
