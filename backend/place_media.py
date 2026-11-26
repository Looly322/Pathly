"""已核验媒体独立持久缓存；不缓存网络失败，不请求任何收费地点服务。"""
import hashlib,json,time,threading
from name_translation import translate_name
from global_places import CACHE,localized_place,commons_photo,ApiError,REQUEST_DEADLINE
MEDIA=CACHE/'place-media-v2'
MEDIA.mkdir(exist_ok=True)
locks={}
guard=threading.Lock()
def media_key(p):
    try:
        lat,lng=float(p['latitude']),float(p['longitude'])
        if not (-90<=lat<=90 and -180<=lng<=180): raise ValueError()
    except (KeyError,ValueError,TypeError): raise ApiError('INVALID_COORDINATES',400)
    return hashlib.sha256(json.dumps([p.get('name'),round(lat,5),round(lng,5),p.get('image','1'),p.get('wikidata'),p.get('commonsFile'),'thumb640-v3'],ensure_ascii=False).encode()).hexdigest()
def cached_media(p):
    path=MEDIA/(media_key(p)+'.json')
    try:
        record=json.loads(path.read_text())
        if time.time()-record['at']<(604800 if (record['data'].get('photo') or record['data'].get('nameZh')) else 600):return record['data']
    except (OSError,ValueError,KeyError):pass
    return None
def get_presentation(params):
    key=media_key(params);path=MEDIA/(key+'.json')
    saved=None if params.get("refresh")=="1" else cached_media(params)
    if saved:return saved
    with guard:lock=locks.setdefault(key,threading.Lock())
    with lock:
        saved=None if params.get("refresh")=="1" else cached_media(params)
        if saved:return saved
        REQUEST_DEADLINE.refresh_media=params.get("refresh")=="1"
        result=None
        filename=params.get('commonsFile','')
        if params.get('image')!='0' and filename.startswith('File:') and len(filename)<240:
            try:
                photo=commons_photo(filename[5:])
                if photo:result={'photo':photo,'photoStatus':'ready'}
            except ApiError:pass
        if result is None:result=localized_place(params)
        if params.get('image')=='0' and not result.get('nameZh'):
            result.update(translate_name(params.get('name','')) or {})
        # 短暂请求失败不能变成永久“无图”；成功照片保留来源供复查。
        if result is not None and result.get('photoStatus')!='error':
            tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps({'at':time.time(),'data':result},ensure_ascii=False));tmp.replace(path)
        return result
