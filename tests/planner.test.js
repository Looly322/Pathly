import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePlace} from '../src/planner/place.js';
import {generateItineraries,scheduleDay,preferenceScore} from '../src/planner/planner.js';
const settings={date:'2026-10-01',days:3,start:'09:00',end:'20:00',budget:500,interests:['CULTURE','FOOD'],walking:'medium',party:'solo',mustIds:[]};
const candidates=Array.from({length:24},(_,i)=>normalizePlace({id:'p'+i,name:(i%4===0?'Museum':i%4===1?'Shopping Mall':i%4===2?'Park':'Restaurant')+' '+i,source:'test',latitude:48.85+(i%6)*.001,longitude:2.35+Math.floor(i/6)*.002,categories:[]}));
test('three paces have bounded main activities, meals, rest, distinct composition and no repeats',()=>{
 const variants=generateItineraries(candidates,settings);
 for(const [index,plan] of variants.entries()){
  const ids=[];
  assert.equal(plan.days.length,3);
  for(const day of plan.days){
   assert.ok(day.fatigue.activities<=[3,4,5][index]);
   assert.equal(day.conflicts.length,0);
   assert.deepEqual(day.events.filter(e=>e.kind==='MEAL').map(e=>e.slot),['LUNCH','DINNER']);
   assert.ok(day.events.some(e=>e.kind==='REST'));
   for(const e of day.events){assert.ok(e.end<=1200);if(e.window)assert.ok(e.start>=e.window.start&&e.end<=e.window.end);if(e.place)ids.push(e.place.id);}
  }
  assert.equal(new Set(ids).size,ids.length);
 }
 assert.ok(variants[2].days.reduce((s,d)=>s+d.fatigue.activities,0)>variants[0].days.reduce((s,d)=>s+d.fatigue.activities,0));
});
test('interests affect scores, selected composition, explanations, and dining events',()=>{
 const culture=generateItineraries(candidates,{...settings,days:1,interests:['CULTURE']})[1];
 const shopping=generateItineraries(candidates,{...settings,days:1,interests:['SHOPPING','FOOD']})[1];
 const count=(plan,type)=>plan.days[0].events.filter(e=>e.place?.category===type).length;
 assert.ok(count(culture,'CULTURE')>count(shopping,'CULTURE'));
 assert.ok(count(shopping,'SHOPPING')>count(culture,'SHOPPING'));
 assert.ok(shopping.days[0].events.filter(e=>e.kind==='MEAL').every(e=>e.reason==='foodMeal'));
 assert.ok(culture.days[0].events.filter(e=>e.kind==='MEAL').every(e=>e.reason==='meal'));
});
test('missing restaurant means a meal event, never an invented POI; scarce data does not repeat',()=>{
 const p=generateItineraries(candidates.slice(0,1),{...settings,days:4})[2];
 assert.equal(p.days.flatMap(d=>d.events.filter(e=>e.kind==='ACTIVITY')).length,1);
 assert.ok(p.days.every(d=>d.events.filter(e=>e.kind==='MEAL').every(e=>e.place===null&&e.foodCandidate)));
});
test('far-away activities and short days cannot be made feasible by compressing landmark stays',()=>{
 const far=normalizePlace({...candidates[0],id:'far',latitude:49.9,longitude:4.2});
 const p=generateItineraries([candidates[0],far],{...settings,days:1,start:'09:00',end:'13:00'})[2];
 assert.ok(p.days[0].fatigue.activities<=1);assert.equal(p.days[0].overflow,0);
});
test('manual changes expose conflicts and unmet must-visits are explicit',()=>{
 const d=scheduleDay([{place:candidates[0],duration:800}],settings,'efficient');assert.ok(d.conflicts.includes('time'));
 const p=generateItineraries(candidates,{...settings,days:1,start:'09:00',end:'09:30',mustIds:['p0']})[1];assert.deepEqual(p.unplacedMust,['p0']);
});
test('provider categories outrank ambiguous names; hotels never enter a sightseeing plan',()=>{
 const raw={id:'h',source:'test',latitude:40.75,longitude:-73.98};
 const hotel=normalizePlace({...raw,name:'Hotel at Times Square',categories:[{name:'Hotel'}]});
 const park=normalizePlace({...raw,id:'park',name:'Central Park Mall',categories:[{name:'Park'}]});
 assert.equal(park.category,'NATURE');
 assert.equal(hotel.planningEligible,false);
 assert.equal(generateItineraries([hotel],settings)[0].days.flatMap(d=>d.items).length,0);
});
test('food interest does not fill a day with repeated cafes',()=>{
 const cafes=Array.from({length:7},(_,i)=>normalizePlace({id:'c'+i,name:'Cafe '+i,latitude:48.85+i*.001,longitude:2.35,categories:[{name:'Coffee Shop'}]}));
 const plans=generateItineraries([...candidates,...cafes],{...settings,interests:['ART','FOOD']});
 for(const plan of plans)for(const day of plan.days)assert.ok(day.items.filter(i=>i.place.category==='CAFE').length<=1);
});
test('AMap hierarchical park/plaza types use the most specific category',()=>{
 const p=normalizePlace({id:'park',name:'北海公园',source:'amap',latitude:39.9,longitude:116.4,categories:[{name:'风景名胜'},{name:'公园广场'},{name:'公园'}],category:'poi'});
 assert.equal(p.category,'NATURE');assert.equal(p.estimatedDuration,90);assert.equal(p.visit.type,'cityPark');
});
test('specific cuisine falls back to the restaurant parent instead of becoming an attraction',()=>{
 const p=normalizePlace({id:'food',name:'新疆特色烧烤',source:'amap',categories:[{name:'餐饮服务'},{name:'中餐厅'},{name:'新疆菜'}],latitude:39.9,longitude:116.4});
 assert.equal(p.category,'FOOD');
});
