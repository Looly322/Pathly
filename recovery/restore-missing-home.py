# Exact photo IDs/credits from the 2026-10-20 08:20:53Z original asset-list patch.
from pathlib import Path
import subprocess,json,concurrent.futures
rows=[('bright-alpine',32699384,'scenic-alpine-meadow-with-mountain-view','Alexandre Moreira'),('bright-austria',33857023,'scenic-alpine-meadow-in-austria-s-summer-landscape','Lipot Repaszky'),('bright-waterfall',19479688,'waterfall-in-a-forest','Vitor Testoni'),('bright-forum',29498936,'ancient-roman-forum-in-rome-sunny-day-view','Anna Holodna'),('bright-mini-torii',31039202,'vibrant-red-torii-gate-structure-in-kyoto-japan','Caroline Schenato'),('bright-bund',23507181,'shanghai-skyline-at-night','鱼 木'),('bright-market',33743232,'authentic-chinese-street-market-stall','Richard L')]
p=Path('public/images/home/credits.json');credits=json.loads(p.read_text())
def download(r):
 name,n,slug,author=r;url=f'https://images.pexels.com/photos/{n}/pexels-photo-{n}.jpeg?auto=compress&fm=webp&w=1200&q=80'
 subprocess.run(['curl','-fLsS','--max-time','25',url,'-o',f'public/images/home/{name}.webp'],check=True)
 return {'id':name,'author':author,'source':f'https://www.pexels.com/photo/{slug}-{n}/','license':'Pexels License','licenseUrl':'https://www.pexels.com/license/','asset':f'/images/home/{name}.webp','download':url}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:entries=list(pool.map(download,rows))
ids={r['id'] for r in entries};credits=[c for c in credits if c['id'] not in ids]+entries;p.write_text(json.dumps(credits,ensure_ascii=False,indent=2)+'\n');print('Restored original photos',len(entries))
