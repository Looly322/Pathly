"""有凭据时运行的真实验收；报告不记录 Key、认证 URL 或伪造结果。"""
import json
from pathlib import Path
from collections import Counter
from opentripmap import request,search,details
from global_places import destinations
report=[]
for zh,en in [('北京','Beijing'),('东京','Tokyo'),('巴黎','Paris'),('开罗','Cairo'),('马拉喀什','Marrakech'),('库斯科','Cusco')]:
    row={'city':zh,'english':en}
    try:
        city=request('geoname',{'name':en})
        if city.get('status')!='OK':raise ValueError('CITY_NOT_FOUND')
        params={'latitude':city['lat'],'longitude':city['lon'],'city':city['name'],'countryCode':city['country'],'interests':'CULTURE,NATURE'}
        result=search(params);row.update({'status':'OK','destination':params,'count':len(result['places']),'totalValid':result['totalValid'],'radii':result['radii'],'categories':dict(Counter(p['poiCategory'] for p in result['places'])),'places':result['places']})
        # 每城只查两条真实详情，剩余详情由实际规划后按天异步获取。
        row['sampleDetails']=[]
        for p in result['places'][:2]:
            try:row['sampleDetails'].append({'name':p['name'],**details(p['sourceId'])})
            except Exception as e:row['sampleDetails'].append({'name':p['name'],'error':str(e)})
        try:
            resolved=destinations(zh);row['chineseResolved']=any(d['countryCode']==city['country'] for d in resolved)
        except Exception as e:row['chineseResolverError']=str(e)
    except Exception as e:row['error']=str(e)
    report.append(row);Path('backend/otm-live-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(zh,row.get('status',row.get('error')),row.get('count'),row.get('categories'),flush=True)
