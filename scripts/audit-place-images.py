"""全量检查已有真实 POI 的开放图片匹配；不读取密钥、不调用 Foursquare。"""
import sys,json,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'backend'))
from place_media import get_presentation
places=json.loads(Path('backend/data/current_places.json').read_text())
report=[]
def check(p):
    try:
        data=get_presentation(dict(name=p['name'],latitude=p['latitude'],longitude=p['longitude'],city=p.get('city',''),category=p.get('categories',[{}])[0].get('name',''),image='1'))
        return dict(id=p['id'],name=p['name'],country=p['countryCode'],status='matched' if data.get('photo') else data.get('photoStatus','missing'),photo=data.get('photo'),nameZh=data.get('nameZh'))
    except Exception as e:return dict(id=p['id'],name=p['name'],country=p['countryCode'],status='error',error=str(e))
with ThreadPoolExecutor(max_workers=2) as pool:
    for job in as_completed([pool.submit(check,p) for p in places]):
        result=job.result();report.append(result)
        Path('backend/image-coverage-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
        if len(report)%10==0 or result['status']=='error':print(len(report),result['country'],result['status'],result['name'],flush=True)
print('TOTAL',len(report),'MATCHED',sum(r['status']=='matched' for r in report),flush=True)
