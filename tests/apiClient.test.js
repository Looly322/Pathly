import test from 'node:test';
import assert from 'node:assert/strict';
import {apiJson,searchErrorKey} from '../src/services/apiClient.js';
test('missing API returning HTML is a deployment error, including HTTP 200 SPA fallback',async()=>{
 const previous=global.fetch;
 try{for(const status of [200,404]){global.fetch=async()=>new Response('<html>Pathly</html>',{status,headers:{'Content-Type':'text/html'}});await assert.rejects(apiJson('/api/test'),/API_NOT_DEPLOYED/);}}
 finally{global.fetch=previous;}
});
test('API preserves JSON, missing-key error, and aggregate resolver failures',async()=>{
 const previous=global.fetch;
 try{
  global.fetch=async()=>Response.json({destinations:[{name:'Paris'}]});assert.equal((await apiJson('/api/test')).destinations[0].name,'Paris');
  global.fetch=async()=>Response.json({error:'OTM_KEY_MISSING'},{status:503});await assert.rejects(apiJson('/api/test'),/OTM_KEY_MISSING/);
  assert.equal(searchErrorKey(new AggregateError([Error('AMAP_FAILED'),Error('API_NOT_DEPLOYED')])),'planner.apiNotDeployed');
 }finally{global.fetch=previous;}
});
