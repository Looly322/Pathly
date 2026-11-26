"""Open-Meteo 非商业免费预报代理。独立十分钟缓存，不复用地点的长期缓存。"""
import hashlib,json,math,threading,time
from urllib.parse import urlencode
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from global_places import CACHE,CONTEXT,ApiError
ROOT=CACHE/'weather';ROOT.mkdir(exist_ok=True)
LOCK=threading.Lock()

def forecast(params):
    try:
        lat,lon=float(params['latitude']),float(params['longitude'])
        if not math.isfinite(lat+lon) or not(-90<=lat<=90 and -180<=lon<=180):raise ValueError()
    except (KeyError,TypeError,ValueError):raise ApiError('INVALID_COORDINATES',400)
    lat,lon=round(lat,4),round(lon,4)
    key=hashlib.sha256(f'{lat},{lon}'.encode()).hexdigest()
    path=ROOT/(key+'.json')
    def cached():
        try:
            data=json.loads(path.read_text())
            if 0<=time.time()-data['fetchedAt']<600:return data
        except (OSError,ValueError,KeyError):pass
    saved=cached()
    if saved:return saved
    # 少量并发请求合并，服务繁忙及时回退，不无限排队。
    if not LOCK.acquire(timeout=1):raise ApiError('WEATHER_BUSY',503)
    try:
        saved=cached()
        if saved:return saved
        now=time.time();usage=ROOT/'usage.json'
        try:recent=[v for v in json.loads(usage.read_text()) if now-v<86400]
        except (OSError,ValueError):recent=[]
        # 保守本地上限，低于官方非商业免费额度；429 后短暂停止调用。
        if len(recent)>=900 or sum(now-v<60 for v in recent)>=30:raise ApiError('WEATHER_LIMIT',429)
        cooldown=ROOT/'cooldown.json'
        try:
            if now<float(cooldown.read_text()):raise ApiError('WEATHER_LIMIT',429)
        except (OSError,ValueError):pass
        usage.write_text(json.dumps(recent+[now]))
        query={'latitude':lat,'longitude':lon,'timezone':'auto','forecast_days':16,
          'current':'temperature_2m,weather_code,wind_speed_10m',
          'daily':'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
          'temperature_unit':'celsius','wind_speed_unit':'kmh'}
        try:
            with urlopen(Request('https://api.open-meteo.com/v1/forecast?'+urlencode(query),headers={'User-Agent':'Pathly/1.0 (educational travel planner)','Accept':'application/json'}),context=CONTEXT,timeout=8) as response:
                data=json.load(response)
        except HTTPError as error:
            if error.code==429:cooldown.write_text(str(now+60))
            raise ApiError('WEATHER_UPSTREAM_'+str(error.code),502) from None
        except Exception:raise ApiError('WEATHER_UNAVAILABLE',502) from None
        if data.get('error') or not data.get('timezone') or not isinstance(data.get('daily',{}).get('time'),list):raise ApiError('WEATHER_INVALID_RESPONSE',502)
        data.update(fetchedAt=time.time(),requestedCoordinates={'latitude':lat,'longitude':lon},source='Open-Meteo')
        path.write_text(json.dumps(data));return data
    finally:LOCK.release()
