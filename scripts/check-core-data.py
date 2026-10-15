"""只调用现有地理编码和本地 POI 快照；不调用 Foursquare。"""
import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'backend'))
from global_places import destinations,current_places
results=[]
for query,english,days,interests in [('北京','Beijing',3,['CULTURE','FOOD']),('东京','Tokyo',4,['FOOD','SHOPPING','CITY_WALK']),('巴黎','Paris',4,['ART','FOOD']),('开罗','Cairo',3,['CULTURE','FOOD']),('纽约','New York',3,['SHOPPING','FOOD','CITY_WALK'])]:
 try:
  cities=destinations(query)
  if not cities:raise RuntimeError('No destination')
  city=cities[0]
  records=current_places(city)['places'] if city['countryCode']!='CN' else []
  result=dict(query=query,days=days,interests=interests,destination=city,places=records)
  if query=='开罗':
   result['aliases']={q:destinations(q)[0]['id'] for q in ['Cairo','Cairo, Egypt']}
  results.append(result)
  print(query,city['city'],city['countryCode'],len(records),flush=True)
 except Exception as e:
  results.append(dict(query=query,error=str(e)));print(query,type(e).__name__,str(e),flush=True)
Path('backend/core-data-validation.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
