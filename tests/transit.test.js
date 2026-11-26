import test from 'node:test';
import assert from 'node:assert/strict';
import { transitUrl } from '../src/utils/transit.js';
test('transit links use explicit destination coordinates across global cities',()=>{
 for(const [lat,lng] of [[51.5,-.12],[35.68,139.76],[48.85,2.35],[-33.86,151.2],[40.75,-73.98]]){
  const url=new URL(transitUrl({latitude:lat,longitude:lng},{latitude:lat+.01,longitude:lng+.01}));
  assert.equal(url.searchParams.get('origin'),`${lat},${lng}`);
  assert.equal(url.searchParams.get('travelmode'),'transit');
  assert.ok(url.searchParams.get('destination'));
 }
 assert.throws(()=>transitUrl({latitude:NaN,longitude:0},{latitude:0,longitude:0}));
});
test('Chinese transit links request Chinese and preserve both exact coordinates',()=>{
 const u=new URL(transitUrl({latitude:40.72,longitude:-74.01},{latitude:40.711,longitude:-74.013},'zh'));
 assert.equal(u.searchParams.get('hl'),'zh-CN');assert.equal(u.searchParams.get('destination'),'40.711,-74.013');
});
