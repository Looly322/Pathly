import json,re
from pathlib import Path
source=Path('/Users/conths/.codex/sessions/2026/09/29/rollout-2026-09-29T14-10-41-01a0ebc9-6ae6-74a1-b8d1-7a327f071014.jsonl')
found=[]
for l in source.open():
 r=json.loads(l)
 if r.get('timestamp','')>='2026-11-26':continue
 p=r.get('payload',{})
 if p.get('type') not in ('custom_tool_call_output','function_call_output'):continue
 outputs=p.get('output',[])
 if isinstance(outputs,str):outputs=[{'text':outputs}]
 for out in outputs:
  text=out.get('text','') if isinstance(out,dict) else ''
  try:text=json.loads(text).get('output',text)
  except:pass
  for m in re.finditer(r'<script setup>.*?</style>',text,re.S):
   s=m[0]
   if 'folder-front' in s and 'DESTINATIONS' in s and 'truncated' not in s:
    found.append({'at':r['timestamp'],'code':s})
if found:
 Path('src/components/DestinationGallery.vue').write_text(found[-1]['code']+'\n');print('Original gallery snapshot',found[-1]['at'],len(found[-1]['code']))
Path('recovery/gallery-snapshots.json').write_text(json.dumps([{'at':f['at'],'length':len(f['code'])} for f in found],indent=2))
