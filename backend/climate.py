"""Historical same-calendar-day averages, never a future daily forecast."""
import json,math,threading
from datetime import date
from urllib.parse import urlencode
from urllib.request import Request,urlopen
from global_places import CONTEXT,ApiError
import reference_cache as cache
LOCK=threading.Lock()
def aggregate(raw,dates,first,last):
 d=raw.get('daily',{});out={}
 for target in dates:
  def select(monthly=False):
   return [i for i,t in enumerate(d.get('time',[])) if (t[5:7]==target[5:7] if monthly else t[5:]==target[5:]) and all(i<len(d.get(k,[])) and isinstance(d[k][i],(int,float)) and math.isfinite(d[k][i]) for k in ['temperature_2m_max','temperature_2m_min','precipitation_sum'])]
  indexes=select();kind='historical_climate'
  if len(indexes)<3:indexes=select(True);kind='monthly_climate'
  if len(indexes)<3:out[target]={'type':'unavailable'};continue
  def mean(k):return round(sum(d[k][i] for i in indexes)/len(indexes),1)
  out[target]={'type':kind,'high':mean('temperature_2m_max'),'low':mean('temperature_2m_min'),'precipitation_mm':mean('precipitation_sum'),'sampleDays':len(indexes),'period':f'{first}–{last}','source':'Open-Meteo ERA5','isForecast':False}
 return out
def climate(params):
 try:
  lat,lon=round(float(params['latitude']),4),round(float(params['longitude']),4)
  dates=list(dict.fromkeys(params.get('dates','').split(',')))
  if not math.isfinite(lat+lon) or abs(lat)>90 or abs(lon)>180 or not 1<=len(dates)<=14:raise ValueError()
  for d in dates:date.fromisoformat(d)
 except (KeyError,TypeError,ValueError):raise ApiError('INVALID_CLIMATE_QUERY',400)
 last=date.today().year-1;first=last-4
 key=f'climate-v1:{lat},{lon}:{first}:{last}'
 raw=cache.get(key)
 if raw is None:
  if not LOCK.acquire(timeout=1):return {'days':{d:{'type':'unavailable'} for d in dates}}
  try:
   raw=cache.get(key)
   if raw is None:
    q=dict(latitude=lat,longitude=lon,start_date=f'{first}-01-01',end_date=f'{last}-12-31',timezone='auto',models='era5',daily='temperature_2m_max,temperature_2m_min,precipitation_sum')
    try:
     with urlopen(Request('https://archive-api.open-meteo.com/v1/archive?'+urlencode(q),headers={'User-Agent':'Pathly/1.0 (educational project)'}),context=CONTEXT,timeout=12) as r:raw=json.load(r)
     if not raw.get('daily',{}).get('time'):raise ValueError()
     cache.put(key,raw,2592000)
    except Exception:
     cache.put(key,{},60)
     return {'days':{d:{'type':'unavailable'} for d in dates}}
  finally:LOCK.release()
 return {'days':aggregate(raw,dates,first,last),'timezone':raw.get('timezone'),'source':'Open-Meteo','type':'historical_climate'}
