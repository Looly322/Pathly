"""Same-origin delivery for verified, attributed Commons media only."""
import hashlib,time,threading
from urllib.parse import urlparse
from urllib.request import Request,urlopen
from global_places import CACHE,CONTEXT,ApiError
import reference_cache as cache
ROOT=CACHE/'image-bytes';ROOT.mkdir(exist_ok=True)
LOCK=threading.Lock()
def allowed(url):return urlparse(url).scheme=='https' and urlparse(url).hostname in ('upload.wikimedia.org','thumb.wikimedia.org')
def normalize(data,params):
 if not isinstance(data,dict):return data
 data=dict(data);photo=data.get('photo')
 if photo and photo.get('source')=='wikimedia-commons' and photo.get('author') and photo.get('license') and allowed(photo.get('url','')):
  photo=dict(photo);urls=list(dict.fromkeys(u for u in [photo.get('url'),photo.get('fallbackUrl')] if u and allowed(u)))
  key=hashlib.sha256('|'.join(urls).encode()).hexdigest();cache.put('media:'+key,urls,604800)
  photo['originalUrl']=photo['url'];photo['url']='/api/place-image?id='+key;photo['fallbackUrl']=urls[0];data['photo']=photo
 data.update(original_name=params.get('name'),localized_name=data.get('nameZh'),image_url=(data.get('photo') or {}).get('url'),image_source=(data.get('photo') or {}).get('source'),image_attribution=(data.get('photo') or {}).get('author'),image_status=data.get('photoStatus','missing'))
 return data
def image(key):
 if len(key)!=64 or any(c not in '0123456789abcdef' for c in key):raise ApiError('INVALID_IMAGE',400)
 urls=cache.get('media:'+key)
 if not urls:raise ApiError('IMAGE_REFERENCE_EXPIRED',404)
 path=ROOT/key
 if path.exists() and time.time()-path.stat().st_mtime<604800:return path.read_bytes()
 if not LOCK.acquire(timeout=1):raise ApiError('IMAGE_BUSY',503)
 try:
  if path.exists() and time.time()-path.stat().st_mtime<604800:return path.read_bytes()
  if cache.get('media-failed:'+key):raise ApiError('IMAGE_TEMPORARILY_UNAVAILABLE',503)
  for url in urls[:2]:
   try:
    with urlopen(Request(url,headers={'User-Agent':'Pathly/1.0 (educational travel planner)'}),context=CONTEXT,timeout=5) as r:
     if not allowed(r.url) or not r.headers.get('Content-Type','').startswith('image/'):continue
     b=r.read(8_000_001)
     if len(b)>8_000_000:continue
     if not (b.startswith(b'\xff\xd8') or b.startswith(b'\x89PNG') or b.startswith(b'RIFF')):continue
     tmp=path.with_suffix('.tmp');tmp.write_bytes(b);tmp.replace(path);return b
   except Exception:continue
  cache.put('media-failed:'+key,True,60);raise ApiError('IMAGE_UNAVAILABLE',502)
 finally:LOCK.release()
