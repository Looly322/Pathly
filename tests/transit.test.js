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
