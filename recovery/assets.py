import ast,json,re,urllib.request,concurrent.futures,ssl
from pathlib import Path
commands=json.load(open('recovery/commands.json'));assets={}
for r in commands:
 for m in re.finditer(r"<<['\"]?(\w+)['\"]?\s*\n(.*?)\n\1(?:\n|$)",r['cmd'],re.S):
  try:tree=ast.parse(m[2])
  except:continue
  for n in ast.walk(tree):
   if not isinstance(n,ast.Assign):continue
   try:rows=ast.literal_eval(n.value)
   except:continue
   if not isinstance(rows,list):continue
   for row in rows:
    if not isinstance(row,(tuple,list)) or len(row)!=4:continue
    name,id,slug,author=row
    if not isinstance(name,str) or not re.fullmatch('[a-z][a-z0-9-]+',name) or not isinstance(author,str):continue
    if isinstance(id,int) and isinstance(slug,str) and '-' in slug:
     assets[name]={'id':name,'author':author,'source':f'https://www.pexels.com/photo/{slug}-{id}/','license':'Pexels License','licenseUrl':'https://www.pexels.com/license/','asset':f'/images/home/{name}.webp','download':f'https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg?auto=compress&fm=webp&w=1200&q=80'}
    elif isinstance(id,str) and re.fullmatch(r'\d{13}-[a-f0-9]+',id):
     assets[name]={'id':name,'author':author,'source':'https://unsplash.com/photos/'+slug,'license':'Unsplash License','licenseUrl':'https://unsplash.com/license','asset':f'/images/home/{name}.webp','download':f'https://images.unsplash.com/photo-{id}?fm=webp&w=1200&q=80'}
root=Path('public/images/home');root.mkdir(parents=True,exist_ok=True)
def fetch(row):
 try:
  data=urllib.request.urlopen(row['download'],timeout=20,context=ssl.create_default_context(cafile='/etc/ssl/cert.pem')).read()
  if not (data.startswith(b'RIFF') or data.startswith(b'\xff\xd8')):raise ValueError('not image')
  (root/(row['id']+'.webp')).write_bytes(data);return {'id':row['id'],'ok':True}
 except Exception as e:return {'id':row['id'],'ok':False,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:result=list(pool.map(fetch,assets.values()))
(root/'credits.json').write_text(json.dumps(list(assets.values()),ensure_ascii=False,indent=2))
Path('recovery/assets-results.json').write_text(json.dumps(result,indent=2));print('Original assets:',len(result),'downloaded:',sum(r['ok'] for r in result))
