import test from 'node:test';
import assert from 'node:assert/strict';
import {hasValidCoordinates,haversineDistance,totalStraightDistance} from '../src/utils/geo.js';
import {optimizePlaceOrder} from '../src/utils/routeOptimizer.js';
import {normalizePoi} from '../src/services/placeService.js';
const p=(id,latitude,longitude,locked=false)=>({id,latitude,longitude,locked});
test('haversine returns kilometers and handles antipodes and same point',()=>{
 assert.ok(Math.abs(haversineDistance(p('a',0,0),p('b',0,1))-111.195)<.01);
 assert.equal(haversineDistance(p('a',30,120),p('b',30,120)),0);
 assert.ok(Number.isFinite(haversineDistance(p('a',0,0),p('b',0,180))));
});
test('invalid coordinates cannot enter route optimizer',()=>{
 for(const a of [p('x',NaN,0),p('x',91,0),p('x',0,181),p('x','30',120),p('x',null,120)]){assert.equal(hasValidCoordinates(a),false);assert.throws(()=>optimizePlaceOrder([a]),/INVALID_COORDINATES/)}
});
test('nearest neighbor keeps first, retains locks, does not mutate input',()=>{
 const places=[p('first',0,0),p('far',0,3,true),p('near',0,1),p('middle',0,2)];
 const snapshot=JSON.stringify(places),result=optimizePlaceOrder(places);
 assert.deepEqual(result.map(p=>p.id),['first','near','middle','far']);assert.equal(result.at(-1).locked,true);assert.equal(JSON.stringify(places),snapshot);
 assert.ok(totalStraightDistance(result)<totalStraightDistance(places));
 assert.deepEqual(optimizePlaceOrder([]),[]);assert.deepEqual(optimizePlaceOrder([places[0]]),[places[0]]);
});
test('POI normalization preserves actual fields, never fabricates ratings or price',()=>{
 const poi=normalizePoi({id:'B123',name:'West Lake',address:'Lake Road',type:'Scenic area',location:{getLat:()=>30.2,getLng:()=>120.1}},'杭州');
 assert.equal(poi.source,'amap');assert.equal(poi.poiId,'B123');assert.equal(poi.latitude,30.2);assert.equal(poi.estimatedStay,60);
 for(const key of ['rating','price','heat','crowdLevel'])assert.equal(key in poi,false);
 assert.equal(normalizePoi({id:'bad',name:'bad',location:{lat:100,lng:120}},'杭州'),null);
 assert.equal(normalizePoi({id:'bad',name:'bad',location:{lat:[],lng:''}},'杭州'),null);
 assert.equal(normalizePoi({name:'no ID',location:{lat:30,lng:120}},'杭州'),null);
});
