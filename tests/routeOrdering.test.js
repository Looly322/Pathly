import test from 'node:test';
import assert from 'node:assert/strict';
import {orderDailyRoute,routeDistance} from '../src/planner/routeOrdering.js';
import {normalizePlace} from '../src/planner/place.js';
import {generateItineraries} from '../src/planner/planner.js';
test('nearest-neighbor and 2-opt reduce crossing route and preserve all stops',()=>{
 const p=[[0,0],[.03,.03],[0,.03],[.03,0]].map(([latitude,longitude],id)=>({id,latitude,longitude}));
 const route=orderDailyRoute(p);assert.ok(routeDistance(route)<routeDistance(p));assert.equal(route[0],p[0]);assert.equal(new Set(route.map(p=>p.id)).size,4);
});
test('OTM duration and classification survive normalization without a photo',()=>{
 const p=normalizePlace({id:'otm-x',source:'opentripmap',name:'Museum',category:'CULTURE',subcategories:['CULTURE'],estimatedDuration:150,latitude:1,longitude:2});
 assert.equal(p.estimatedDuration,150);assert.equal(p.image,null);assert.deepEqual(p.subcategories,['CULTURE']);
});
test('outskirts are not silently included in a short urban day',()=>{
 const p=normalizePlace({id:'otm-x',source:'opentripmap',name:'Far museum',category:'CULTURE',subcategories:['CULTURE'],estimatedDuration:150,isOutskirts:true,latitude:1,longitude:2});
 const settings={days:1,date:'2026-10-13',start:'09:00',end:'13:00',walking:'medium',budget:500,interests:['CULTURE'],mustIds:[]};
 assert.equal(generateItineraries([p],settings)[1].days[0].items.length,0);
});
