"""Same-origin delivery for verified, attributed Commons media only."""
import hashlib,time,threading,os
from urllib.parse import urlparse
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
import socket
from global_places import CACHE,CONTEXT,ApiError
import reference_cache as cache
ROOT=CACHE/'image-bytes';ROOT.mkdir(exist_ok=True)
LOCK=threading.BoundedSemaphore(3)
KEY_LOCKS=[threading.Lock() for _ in range(64)]
def allowed(url):return urlparse(url).scheme=='https' and urlparse(url).hostname in ('upload.wikimedia.org','thumb.wikimedia.org')
def normalize(data,params):
 if not isinstance(data,dict):return data
 data=dict(data);photo=data.get('photo')
 if params.get('part')=='text' and not data.get('nameZh'):
  from name_translation import translate_name
  data.update(translate_name(params.get('name')) or {})
 if photo and photo.get('source')=='wikimedia-commons' and photo.get('author') and photo.get('license') and allowed(photo.get('url','')):
  photo=dict(photo);urls=list(dict.fromkeys(u for u in [photo.get('url'),photo.get('fallbackUrl')] if u and allowed(u)))
  key=hashlib.sha256('|'.join(urls).encode()).hexdigest();cache.put('media:'+key,urls,604800)
  if params.get('refresh')=='1':cache.delete('media-failed:'+key)
  photo['originalUrl']=photo['url'];photo['url']='/api/place-image?id='+key;photo['fallbackUrl']=urls[0];data['photo']=photo
 data.update(original_name=params.get('name') or data.get('name'),localized_name=data.get('nameZh'),image_url=(data.get('photo') or {}).get('url'),image_source=(data.get('photo') or {}).get('source'),image_attribution=(data.get('photo') or {}).get('author'),image_status=data.get('photoStatus','missing'))
 return data
def image(key):
 if len(key)!=64 or any(c not in '0123456789abcdef' for c in key):raise ApiError('INVALID_IMAGE',400)
 urls=cache.get('media:'+key)
 if not urls:raise ApiError('IMAGE_REFERENCE_EXPIRED',404)
 path=ROOT/key
 if path.exists() and time.time()-path.stat().st_mtime<604800:return path.read_bytes()
 key_lock=KEY_LOCKS[int(key[:2],16)%64]
 if not key_lock.acquire(timeout=11):raise ApiError('IMAGE_BUSY',503)
 if not LOCK.acquire(timeout=1):
  key_lock.release();raise ApiError('IMAGE_BUSY',503)
 try:
  if path.exists() and time.time()-path.stat().st_mtime<604800:return path.read_bytes()
  failure=cache.get('media-failed:'+key)
  if failure:raise ApiError(failure if isinstance(failure,str) else 'IMAGE_TEMPORARILY_UNAVAILABLE',503)
  reason='IMAGE_UNAVAILABLE'
  for url in urls[:2]:
   try:
    with urlopen(Request(url,headers={'User-Agent':os.environ.get('WIKIMEDIA_USER_AGENT','Pathly/1.0 (https://github.com/Looly322/Pathly/issues)')}),context=CONTEXT,timeout=5) as r:
     if not allowed(r.url) or not r.headers.get('Content-Type','').startswith('image/'):continue
     b=r.read(8_000_001)
     if len(b)>8_000_000:continue
     if not (b.startswith(b'\xff\xd8') or b.startswith(b'\x89PNG') or b.startswith(b'RIFF')):continue
     tmp=path.with_suffix('.tmp');tmp.write_bytes(b);tmp.replace(path);return b
   except HTTPError as e:reason='IMAGE_HTTP_'+str(e.code)
   except (TimeoutError,socket.timeout):reason='IMAGE_TIMEOUT'
   except URLError:reason='IMAGE_NETWORK_ERROR'
   except Exception:reason='IMAGE_INVALID_RESPONSE'
  cache.put('media-failed:'+key,reason,60);raise ApiError(reason,502)
 finally:
  LOCK.release();key_lock.release()
