import json,base64
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
source=Path('/Users/conths/.codex/sessions/2026/09/29/rollout-2026-09-29T14-10-41-01a0ebc9-6ae6-74a1-b8d1-7a327f071014.jsonl')
for line in source.open():
 if '4778f4203aec2d0f0baa792bdc39305a' not in line:continue
 r=json.loads(line)
 if r.get('timestamp')!='2026-10-23T12:55:33.297Z':continue
 images=[i['image_url'] for i in r.get('payload',{}).get('content',[]) if i.get('type')=='input_image']
 if images:
  Path('public/images/home/destination-snow-lake.jpg').write_bytes(base64.b64decode(images[0].split(',',1)[1]));print('Recovered actual user attachment snow lake')
  break
fonts=[('pathly-source-han-serif','PathlySourceHanSerifSubset','行到水穷处，坐看云起时。人事有代谢，往来成古今。东风夜放花千树，更吹落、星如雨。日啖荔枝三百颗，不辞长作岭南人。'),('pathly-destinations','PathlyDestinationSerif','北京东京巴黎罗马京都伦敦上海巴厘岛'),('pathly-search-serif','PathlySearchSerif','把向往，安排成旅程。')]
for file,name,text in fonts:
 f=TTFont('recovery/sourcehan.otf');o=subset.Options();o.name_IDs=['*'];o.name_languages=['*'];s=subset.Subsetter(options=o);s.populate(text=text);s.subset(f)
 for n in f['name'].names:
  if n.nameID in (1,3,4,6,16):n.string=name.encode(n.getEncoding())
 f.flavor='woff2';f.save('public/fonts/'+file+'.woff2')
