"""已核验媒体独立持久缓存；不缓存网络失败，不请求任何收费地点服务。"""
import hashlib,json,time,threading
from global_places import CACHE,localized_place,ApiError
MEDIA=CACHE/'place-media-v1'
MEDIA.mkdir(exist_ok=True)
locks={}
guard=threading.Lock()
def media_key(p):
    return hashlib.sha256(json.dumps([p.get('name'),round(float(p['latitude']),5),round(float(p['longitude']),5)],ensure_ascii=False).encode()).hexdigest()
def cached_media(p):
    path=MEDIA/(media_key(p)+'.json')
    try:
        record=json.loads(path.read_text())
        if record['data'].get('photo'): return record['data']
    except (OSError,ValueError,KeyError):pass
    return None
def get_presentation(params):
    key=media_key(params);path=MEDIA/(key+'.json')
    saved=cached_media(params)
    if saved:return saved
    with guard:lock=locks.setdefault(key,threading.Lock())
    with lock:
        saved=cached_media(params)
        if saved:return saved
        result=localized_place(params)
        # 短暂请求失败不能变成永久“无图”；成功照片保留来源供复查。
        if result.get('photo'):
            tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps({'at':time.time(),'data':result},ensure_ascii=False));tmp.replace(path)
        return result
