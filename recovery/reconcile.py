from pathlib import Path
# Remove overlapping replay additions that are identical; retain the latest typed category block.
for p in Path('src').rglob('*'):
 if p.suffix not in ('.js','.vue'):continue
 s=p.read_text();lines=s.splitlines(True)
 for n in range(16,0,-1):
  i=0
  while i+2*n<=len(lines):
   chunk=lines[i:i+n]
   if chunk==lines[i+n:i+2*n] and any(('import ' in l or 'const ' in l or 'function ' in l) for l in chunk):del lines[i:i+n]
   else:i+=1
 p.write_text(''.join(lines))
p=Path('src/planner/place.js');s=p.read_text();a=s.index("  const typeNames");b=s.index("  const typeNames",a+1);s=s[:a]+s[b:];dup="planningEligible:raw.planningEligible!==false&&!excluded&&!(/restaurants/.test(raw.type||'')&&/museums/.test(raw.type||'')),";s=s.replace(dup+dup,dup);p.write_text(s)
p=Path('src/services/placePresentation.js');s=p.read_text().replace("   if(Date.now()<retryAfter)throw new Error('IMAGE_RATE_LIMITED');\n",'');p.write_text(s)
