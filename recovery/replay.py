import json,re,os,builtins,types,shutil
from pathlib import Path as RealPath
base=RealPath.cwd();root=(base/'recovery/stage').resolve();os.chdir(root)
baseline=set((base/'recovery/baseline-files.txt').read_text().splitlines());cutoff='2026-10-20T06:26:11';stamp=''
allowed=('src','backend','tests','scripts','public','reports','docs','recovery')
def resolve(p):
 p=str(p)
 for prefix in ['/Users/conths/Desktop/Pathly/','/Users/conths/Documents/ChatGPT/Pathly/']:
  if p.startswith(prefix):p=p[len(prefix):]
 if p.startswith('/tmp/'):p='recovery/tmp/'+p[5:]
 q=RealPath(p)
 if not q.is_absolute():q=root/q
 q=q.resolve()
 if not q.is_relative_to(root):raise PermissionError('outside recovery root')
 rel=q.relative_to(root)
 if rel.parts and rel.parts[0] not in allowed and len(rel.parts)>1:raise PermissionError('outside source scope')
 if q.name.startswith('.env') and q.name!='.env.example':raise PermissionError('environment file excluded')
 return q
class SafePath(type(RealPath())):
 def __new__(cls,*args):return super().__new__(cls,str(resolve(RealPath(*args))))
 def write_text(self,data,*args,**kwargs):
  resolve(self);
  if stamp<cutoff and str(resolve(self).relative_to(root)) in baseline:return len(data)
  self.parent.mkdir(parents=True,exist_ok=True);return super().write_text(data,*args,**kwargs)
 def write_bytes(self,data):resolve(self);raise PermissionError('binary writes require manual recovery')
def safeopen(p,*args,**kw):return builtins.open(resolve(p),*args,**kw)
def importer(name,*args,**kw):
 if name=='pathlib':return types.SimpleNamespace(Path=SafePath)
 if name in ['re','json','math','collections']:return builtins.__import__(name,*args,**kw)
 raise ImportError('historical import not allowed: '+name)
logs=[];virtual={}
for record in json.loads((base/'recovery/commands.json').read_text()):
 stamp=record['at'];cmd=record['cmd'];actions=[]
 for m in re.finditer(r"(?P<head>(?:cat\s*(?:>|>>)\s*[^\n]+?|python3?\s+[^\n]*?))\s*<<\s*['\"]?(?P<tag>\w+)['\"]?\s*\n(?P<body>.*?)\n(?P=tag)(?:\n|$)",cmd,re.S):
  actions.append((m.start(),m.group('head'),m.group('body')))
 for m in re.finditer(r'(?:^|\n)python3?\s+(/tmp/[\w.-]+\.py)(?:\s|$)',cmd):actions.append((m.start(),'run',m.group(1)))
 for _,head,body in sorted(actions):
  entry={'at':record['at'],'action':head[:120]}
  try:
   if head.startswith('cat'):
    filename=re.search(r'>>?\s*[\'\"]?([^\s\'\"]+)',head)[1]
    if filename.startswith('/tmp/'):
     virtual[filename]=body;continue
    q=resolve(filename)
    if stamp<cutoff and str(q.relative_to(root)) in baseline:continue
    if q.relative_to(root).parts[0] not in allowed:continue
    if '>>' in head:body=(q.read_text() if q.exists() else '')+body+'\n'
    else:body+='\n'
    q.parent.mkdir(parents=True,exist_ok=True);q.write_text(body);entry['status']='snapshot'
   else:
    code=virtual.get(body,'') if head=='run' else body
    if not any(s in code for s in ('write_text','open(','.replace(','.write(')):continue
    env={'__builtins__':{**vars(builtins),'__import__':importer,'open':safeopen},'__name__':'__recovery__','print':lambda *a,**k:None}
    exec(compile(code,'historical-patch','exec'),env);entry['status']='applied'
  except Exception as e:entry.update(status='review',error=type(e).__name__+': '+str(e)[:180])
  logs.append(entry)
(base/'recovery/replay-log.json').write_text(json.dumps(logs,ensure_ascii=False,indent=2))
print('Actions:',len(logs),'applied:',sum(x['status']!='review' for x in logs),'need review:',sum(x['status']=='review' for x in logs))
