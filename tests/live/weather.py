"""真实天气代理验收，无测试替身；结果和完整真实响应存档。"""
import json,time
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError
cases=[('北京',39.9042,116.4074),('巴黎',48.8566,2.3522),('东京',35.6762,139.6503),('开罗',30.0444,31.2357)]
root=Path('reports/weather');root.mkdir(exist_ok=True);rows=[]
for city,lat,lon in cases:
    start=time.monotonic()
    try:
        with urlopen('http://127.0.0.1:8787/api/weather?'+urlencode({'latitude':lat,'longitude':lon}),timeout=15) as response:
            data=json.load(response);status=response.status
        (root/(city+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2))
        rows.append({'city':city,'status':status,'ms':round((time.monotonic()-start)*1000),'requested':data['requestedCoordinates'],'grid':[data['latitude'],data['longitude']],'timezone':data['timezone'],'current':data.get('current'),'forecastStart':data['daily']['time'][0],'forecastEnd':data['daily']['time'][-1],'days':len(data['daily']['time'])})
    except HTTPError as e:rows.append({'city':city,'status':e.code,'error':e.read().decode()})
    except Exception as e:rows.append({'city':city,'error':type(e).__name__})
    print(json.dumps(rows[-1],ensure_ascii=False),flush=True)
(root/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
