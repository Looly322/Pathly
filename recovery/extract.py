import json,re,collections
from pathlib import Path
source=Path('/Users/conths/.codex/sessions/2026/09/29/rollout-2026-09-29T14-10-41-01a0ebc9-6ae6-74a1-b8d1-7a327f071014.jsonl')
commands=[]
for line in source.open():
 r=json.loads(line);p=r.get('payload',{});stamp=r.get('timestamp','')
 if stamp>='2026-11-26' or r.get('type')!='response_item':continue
 if p.get('name')=='exec':
  for m in re.finditer(r'cmd\s*:\s*("(?:\\.|[^"\\])*")',p.get('input','')):
   try:cmd=json.loads(m.group(1))
   except:continue
   if re.search(r'(?:sk-|AIza)[A-Za-z0-9_-]{20,}',cmd):continue
   commands.append({'at':stamp,'cmd':cmd})
 elif p.get('name')=='exec_command':
  try:
   a=json.loads(p.get('arguments','{}'));cmd=a.get('cmd','')
   if re.search(r'(?:sk-|AIza)[A-Za-z0-9_-]{20,}',cmd):continue
   commands.append({'at':stamp,'cmd':cmd})
  except:pass
# Keep only original source creation payloads. Never execute recorded commands.
count=0;manifest=[]
for entry in commands:
 cmd=entry['cmd']
 for m in re.finditer(r"cat\s*>\s*([\w./-]+)\s*<<\s*['\"]?(\w+)['\"]?\s*\n(.*?)\n\2(?:\n|$)",cmd,re.S):
  name,_,body=m.groups();name=name.removeprefix('/Users/conths/Desktop/Pathly/')
  if not name.startswith(('src/','backend/','tests/','scripts/')) or '..' in name.split('/'):continue
  target=Path(name);target.parent.mkdir(parents=True,exist_ok=True);target.write_text(body+'\n');manifest.append({'at':entry['at'],'file':name,'method':'original heredoc snapshot'});count+=1
Path('recovery/source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
# Retain source-edit-only commands for controlled patch recovery; no environment credentials.
edits=[x for x in commands if ('write_text' in x['cmd'] or 'apply_patch' in x['cmd'] or 'cat > src/' in x['cmd'] or 'cat > backend/' in x['cmd']) and '.env' not in x['cmd']]
Path('recovery/source-edits.json').write_text(json.dumps(edits,ensure_ascii=False,indent=2))
print('Commands indexed:',len(commands),'source snapshots:',count,'unique files:',len({x['file'] for x in manifest}),'edit records:',len(edits))
print('November command dates:',dict(collections.Counter(x['at'][:10] for x in commands if x['at'].startswith('2026-11'))))
