import test from 'node:test';
import assert from 'node:assert/strict';
import {photoEligiblePlaces} from '../src/providers/photoEligibility.js';
const settings={days:3,interests:['CULTURE'],mustIds:[]},destination={city:'Any city',countryCode:'XX'};
const place=id=>({id,name:id,latitude:1,longitude:2,subcategories:['CULTURE'],category:'CULTURE'});
test('only successfully loaded corresponding photos enter candidate pool',async()=>{
 const result=await photoEligiblePlaces([place('good'),place('broken'),place('missing')],settings,destination,{
  lookup:async p=>p.id==='missing'?{}:{photo:{url:'https://example.org/'+p.id}},verify:async u=>u.endsWith('good')
 });
 assert.deepEqual(result.places.map(p=>p.id),['good']);assert.equal(result.excluded,2);assert.equal(result.places[0].photoVerified,true);
});
test('domestic photos are verified too, no external lookup or fabricated fallback',async()=>{
 let lookups=0;
 const result=await photoEligiblePlaces([{...place('domestic'),image:'https://example.org/photo'},place('missing')],settings,{countryCode:'CN'}, {lookup:async()=>{lookups++;},verify:async()=>true});
 assert.equal(lookups,0);assert.equal(result.places.length,1);
});
