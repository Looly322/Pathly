import test from 'node:test';
import assert from 'node:assert/strict';
import {safeWebsite} from '../src/services/placePresentation.js';
import {imageCandidates} from '../src/providers/imageProvider.js';
test('restore verified photo plus fallback without accepting unsafe website URLs',()=>{
 assert.equal(safeWebsite('javascript:alert(1)'),null);
 assert.equal(safeWebsite('https://example.org/place'),'https://example.org/place');
 assert.deepEqual(imageCandidates({photo:{url:'https://example.org/photo',fallbackUrl:'https://example.org/backup'}}),['https://example.org/photo','https://example.org/backup']);
});

test('photo request survives day change, deduplicates and reuses verified result',async()=>{
 const {loadPlacePresentation}=await import('../src/services/placePresentation.js');
 const original=globalThis.fetch;let calls=0,release;
 globalThis.fetch=async()=>{calls++;await new Promise(r=>release=r);return {ok:true,json:async()=>({photo:{url:'https://example.org/real.jpg'},nameZh:'已验证'})};};
 try{
  const p={id:'dedup-test',name:'Place',latitude:1,longitude:2};const abort=new AbortController();
  const first=loadPlacePresentation(p,'City',abort.signal);const cancelled=assert.rejects(first,{name:'AbortError'});abort.abort();
  const second=loadPlacePresentation(p,'City');release();
  await cancelled;assert.equal((await second).nameZh,'已验证');await loadPlacePresentation(p,'City');assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});

test('missing results and failures are cached and active requests have bounded timeouts',async()=>{
 const {loadPlacePresentation}=await import('../src/services/placePresentation.js');const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({photoStatus:'missing'})}};
 try{const p={id:'missing-cache',latitude:1,longitude:2};await loadPlacePresentation(p,'City');await loadPlacePresentation(p,'City');assert.equal(calls,2);
 globalThis.fetch=()=>new Promise(()=>{});const keep=setTimeout(()=>{},100);
 await assert.rejects(loadPlacePresentation({id:'timeout-test',latitude:1,longitude:2},'',null,false,{timeout:30}),{name:'TimeoutError'});clearTimeout(keep);
 }finally{globalThis.fetch=original;}
});
test('manual retry passes stable identity and refresh to backend',async()=>{
 const {loadPlacePresentation}=await import('../src/services/placePresentation.js');const original=globalThis.fetch;let urls=[];
 globalThis.fetch=async url=>{urls.push(url);return {ok:true,json:async()=>({photoStatus:'missing'})}};
 try{const p={id:'refresh-test',name:'Building',latitude:35,longitude:139,wikidata:'Q863588'};
 await loadPlacePresentation(p,'Tokyo',null,false,{part:'photo'});await loadPlacePresentation(p,'Tokyo',null,true,{part:'photo'});
 assert.equal(urls.length,4);const u=new URL(urls[3],'http://localhost');assert.equal(u.searchParams.get('refresh'),'1');assert.equal(u.searchParams.get('wikidata'),'Q863588');
 }finally{globalThis.fetch=original;}
});
test('primary HTTP failure still tries Commons verified fallback',async()=>{
 const {loadPlacePresentation}=await import('../src/services/placePresentation.js');const old=globalThis.fetch;let calls=[];
 globalThis.fetch=async url=>{calls.push(url);return url.startsWith('/api/commons-image')?{ok:true,json:async()=>({photo:{url:'https://upload.wikimedia.org/verified.jpg'},photoStatus:'ready'})}:{ok:false,status:503};};
 try{const result=await loadPlacePresentation({id:'http-fallback',name:'Fixture',latitude:1,longitude:2},'',null,true,{part:'photo'});assert.equal(result.photoStatus,'ready');assert.equal(calls.length,2);}finally{globalThis.fetch=old;}
});
test('queued request receives its own timeout after a slot is available',async()=>{
 const {loadPlacePresentation}=await import('../src/services/placePresentation.js');const old=globalThis.fetch;const releases=[];
 globalThis.fetch=async()=>{if(releases.length<2)await new Promise(r=>releases.push(r));return {ok:true,json:async()=>({nameZh:'核验名称'})};};
 try{const first=Array.from({length:2},(_,i)=>loadPlacePresentation({id:'queue-block-'+i,name:'Fixture',latitude:1,longitude:2},'',null,true,{part:'text',timeout:500}));const queued=loadPlacePresentation({id:'queue-last',name:'Fixture',latitude:1,longitude:2},'',null,true,{part:'text',timeout:50});await new Promise(r=>setTimeout(r,80));releases.forEach(r=>r());await Promise.all(first);assert.equal((await queued).nameZh,'核验名称');}finally{globalThis.fetch=old;}
});

test('slow photos do not occupy the text lane; stable QID bypasses OTM',async()=>{
 const {loadPlacePresentation}=await import('../src/services/placePresentation.js');const old=globalThis.fetch;const releases=[];let urls=[];
 globalThis.fetch=async url=>{urls.push(url);if(url.includes('image=1'))await new Promise(r=>releases.push(r));return {ok:true,json:async()=>({nameZh:'核验标签',photo:{url:'https://example.org/photo'}})};};
 try{const photos=[1,2].map(i=>loadPlacePresentation({id:'lane-'+i,name:'Place',latitude:1,longitude:2},'',null,true,{part:'photo'}));const text=await loadPlacePresentation({id:'label-lane',source:'opentripmap',sourceId:'xid',wikidata:'Q243',name:'Tour Eiffel',latitude:48.858,longitude:2.294},'',null,true,{part:'text',timeout:100});assert.equal(text.nameZh,'核验标签');assert.ok(urls.at(-1).startsWith('/api/places/localize?'));releases.forEach(r=>r());await Promise.all(photos);}finally{globalThis.fetch=old;}
});
