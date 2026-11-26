"""Commons search + verified Wikidata identity; never choose a fuzzy first hit."""
import hashlib,json,re,html,math,threading,time
from urllib.parse import urlencode
from global_places import get_json,commons_photo,distance_m,ApiError
import reference_cache as cache
LOCKS=[threading.Lock() for _ in range(32)]
API='https://commons.wikimedia.org/w/api.php?'
def clean(meta,key):return html.unescape(re.sub('<[^>]+>','',meta.get(key,{}).get('value',''))).strip()
def photo_info(info):
 meta=info.get('extmetadata',{});license=clean(meta,'LicenseShortName');author=clean(meta,'Artist') or clean(meta,'Attribution');w,h=info.get('width',0),info.get('height',0)
 if w<1000 or h<600 or not author or not re.search(r'CC[ -]?BY|CC0|public domain',license,re.I):return None
 url=info.get('thumburl','');original=info.get('url','')
 if not url.startswith(('https://upload.wikimedia.org/','https://thumb.wikimedia.org/')):return None
 if not re.search(r'\.(jpe?g|png|webp)$',original,re.I):return None
 return dict(url=url,fallbackUrl=original if info.get('size',0)<5000000 else None,page=info.get('descriptionurl'),author=author,license=license,licenseUrl=clean(meta,'LicenseUrl'),source='wikimedia-commons',width=w,height=h)
def search_images(p):
 try:
  lat,lon=float(p['latitude']),float(p['longitude'])
  if not math.isfinite(lat+lon) or abs(lat)>90 or abs(lon)>180:raise ValueError()
 except (KeyError,ValueError,TypeError):raise ApiError('INVALID_COORDINATES',400)
 name=p.get('name','').strip()[:180];kind='city' if p.get('kind')=='city' else 'place'
 if not name:raise ApiError('INVALID_NAME',400)
 key='commons-search-v3:'+hashlib.sha256(json.dumps([name,lat,lon,kind,p.get('wikidata'),p.get('city'),p.get('country')]).encode()).hexdigest()
 saved=cache.get(key)
 if saved and p.get('refresh')!='1':return saved
 lock=LOCKS[int(key[-2:],16)%32]
 if not lock.acquire(timeout=1):return {'photoStatus':'error','photoError':'BUSY'}
 try:
  saved=cache.get(key)
  if saved and p.get('refresh')!='1':return saved
  result=_resolve(p,name,lat,lon,kind)
  cache.put(key,result,604800 if result.get('photo') else 60 if result.get('photoStatus')=='error' else 600)
  return result
 except ApiError as e:
  result={'photoStatus':'error','photoError':str(e)};cache.put(key,result,60);return result
 finally:lock.release()
def _resolve(p,name,lat,lon,kind):
 qid=p.get('wikidata','')
 if not re.fullmatch('Q[0-9]+',qid):
  hits=get_json('https://www.wikidata.org/w/api.php?'+urlencode(dict(action='wbsearchentities',search=name,language='en',format='json',limit=4))).get('search',[])
  ids=[x['id'] for x in hits if re.fullmatch('Q[0-9]+',x.get('id',''))]
 else:ids=[qid]
 if not ids:return {'photoStatus':'missing','matchStatus':'unverified'}
 entities=get_json('https://www.wikidata.org/w/api.php?'+urlencode(dict(action='wbgetentities',ids='|'.join(ids),props='labels|aliases|claims',languages='en|zh|zh-hans|ja|fr|it',format='json'))).get('entities',{})
 norm=lambda v:re.sub(r'[^\w]','',v.casefold())
 for qid,e in entities.items():
  names=[x.get('value','') for x in e.get('labels',{}).values()]+[x.get('value','') for a in e.get('aliases',{}).values() for x in a]
  if not re.fullmatch('Q[0-9]+',p.get('wikidata','')) and norm(name) not in {norm(n) for n in names}:continue
  claims=e.get('claims',{});points=[c.get('mainsnak',{}).get('datavalue',{}).get('value',{}) for c in claims.get('P625',[]) if c.get('rank')!='deprecated']
  if not any('latitude' in c and distance_m((lat,lon),(c['latitude'],c['longitude']))< (30000 if kind=='city' else 1000) for c in points):continue
  # A verified entity's P18 is cheaper and more exact than a broad media search.
  if kind=='place':
   for claim in claims.get('P18',[])[:2]:
    if claim.get('rank')=='deprecated':continue
    filename=claim.get('mainsnak',{}).get('datavalue',{}).get('value')
    if isinstance(filename,str):
     try:photo=commons_photo(filename)
     except ApiError:photo=None
     if photo:return {'photo':{**photo,'wikidata':qid,'matchStatus':'verified-P18'},'photoStatus':'ready','matchStatus':'verified-P18'}
  english=e.get('labels',{}).get('en',{}).get('value',name)
  # Structured depicts constraint is compulsory: text relevance alone is insufficient.
  query=f'haswbstatement:P180={qid} "{english.replace(chr(34), "")}"'
  extras=' '.join(str(p.get(k,''))[:80].replace('"','') for k in ('city','country')).strip()
  if extras:query+=' '+extras
  def fetch_search():
   return get_json(API+urlencode(dict(action='query',generator='search',gsrsearch=query,gsrnamespace=6,gsrlimit=8,prop='imageinfo',iiprop='url|size|extmetadata',iiurlwidth=1280 if kind=='city' else 640,format='json',maxlag=5)),refresh=p.get('refresh')=='1')
  try:data=fetch_search()
  except ApiError as error:
   if error.status in (502,503,504):
    time.sleep(.5)
    try:data=fetch_search()
    except ApiError:data={}
   else:data={}

  candidates=[]
  for page in data.get('query',{}).get('pages',{}).values():
   if re.search('watermark|map|logo|drawing',page.get('title',''),re.I):continue
   for info in page.get('imageinfo',[]):
    photo=photo_info(info)
    if photo:photo.update(matchStatus='verified-depicts',wikidata=qid);candidates.append(photo)
  if candidates:
   candidates.sort(key=lambda x:(abs(x['width']/x['height']-1.6),-x['width']*x['height'],x['page']))
   return {'photo':candidates[0],'photoStatus':'ready','matchStatus':'verified-depicts'}
  # Exact entity P18, not a different attraction from textual search results.
  for claim in claims.get('P18',[])[:2]:
   if claim.get('rank')=='deprecated':continue
   filename=claim.get('mainsnak',{}).get('datavalue',{}).get('value')
   if isinstance(filename,str):
    photo=commons_photo(filename,1280 if kind=='city' else 640)
    if photo:return {'photo':{**photo,'wikidata':qid,'matchStatus':'verified-P18'},'photoStatus':'ready','matchStatus':'verified-P18'}
  return {'photoStatus':'missing','matchStatus':'verified-no-photo'}
 return {'photoStatus':'missing','matchStatus':'unverified'}
