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

test('missing results and failures are cached and timeout includes queue wait',async()=>{
 const {loadPlacePresentation}=await import('../src/services/placePresentation.js');const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({photoStatus:'missing'})}};
 try{const p={id:'missing-cache',latitude:1,longitude:2};await loadPlacePresentation(p,'City');await loadPlacePresentation(p,'City');assert.equal(calls,1);
 globalThis.fetch=()=>new Promise(()=>{});const keep=setTimeout(()=>{},100);
 await assert.rejects(loadPlacePresentation({id:'timeout-test'},'',null,false,{timeout:30}),{name:'TimeoutError'});clearTimeout(keep);
 }finally{globalThis.fetch=original;}
});
