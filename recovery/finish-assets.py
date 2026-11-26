import json,subprocess,concurrent.futures,re
from pathlib import Path
root=Path('public/images/home');credits=json.loads((root/'credits.json').read_text())
rows=[('beijing',30836814,'Nguyen Khuong','serene-view-of-summer-palace-in-beijing'),('tokyo',25526693,'Sun Hung','senso-ji-temple-in-tokyo-a-buddhist-temple-in-the-asakusa-area-tokyo-sunhung'),('paris',37286004,'Lajos Kristóf Kántor','charming-parisian-cafe-in-the-heart-of-montmartre'),('rome',36908205,'Anabel Martínez','trevi-fountain-in-rome-on-a-sunny-day'),('kyoto',20751494,'Huu Huynh','fushimi-inari-taisha-shrine-in-kyoto'),('london',37296256,'Banx Photography','colorful-townhouses-in-notting-hill-london'),('shanghai',10875427,'Marstion','tourists-in-yu-garden'),('bali',36133242,'Evert jan Hoek','bali-rice-fields-with-palm-trees-in-bright-daylight')]
for city,n,author,slug in rows:
 credits.append({'id':'postcards/'+city,'author':author,'source':f'https://www.pexels.com/photo/{slug}-{n}/','license':'Pexels License','licenseUrl':'https://www.pexels.com/license/','asset':f'/images/home/postcards/{city}.webp','download':f'https://images.pexels.com/photos/{n}/pexels-photo-{n}.jpeg?auto=compress&fm=webp&w=1000&q=85'})
(root/'credits.json').write_text(json.dumps(credits,ensure_ascii=False,indent=2)+'\n')
def fetch(r):
 p=Path('public'+r['asset']);p.parent.mkdir(exist_ok=True,parents=True)
 if p.exists():return {'id':r['id'],'ok':True}
 x=subprocess.run(['curl','-fLsS','--max-time','25',r['download'],'-o',str(p)],capture_output=True)
 return {'id':r['id'],'ok':x.returncode==0,'error':x.stderr.decode()[:150]}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:result=list(pool.map(fetch,credits))
Path('recovery/assets-results.json').write_text(json.dumps(result,indent=2));print('downloaded',sum(r['ok'] for r in result),'of',len(result))
