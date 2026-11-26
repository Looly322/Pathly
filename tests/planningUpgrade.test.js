import test from 'node:test';import assert from 'node:assert/strict';
import {normalizePlace} from '../src/planner/place.js';
import {generateItineraries,scheduleDay} from '../src/planner/planner.js';
import {collapseContained,containedBy} from '../src/planner/visitDuration.js';
import {evaluatePlan} from '../src/planner/planQuality.js';
import {recommendationValue} from '../src/planner/recommendationValue.js';
import {improveDays} from '../src/planner/improveDays.js';
const settings={date:'2026-11-20',days:3,start:'09:00',end:'20:00',interests:['CULTURE','FOOD'],pace:'balanced',walking:'medium',budget:1000,mustIds:[]};
const p=(id,name,latitude=39.917,longitude=116.397,type='历史建筑')=>normalizePlace({id,name,latitude,longitude,type,source:'amap',countryCode:'CN'});
test('verified Palace and Jingshan components collapse but adjacent independent sites remain',()=>{
 const palace=p('p','故宫博物院'),gate=p('g','午门',39.914),garden=p('j','景山公园',39.925),tower=p('t','绮望楼',39.924),square=p('s','天安门',39.908);
 const result=collapseContained([palace,gate,garden,tower,square],['g']);assert.deepEqual(result.places.map(p=>p.id),['p','j','s']);assert.equal(result.covered.length,2);assert.equal(containedBy({...tower,latitude:31},garden),false);
 const plan=generateItineraries([palace,gate,garden,tower,square],{...settings,mustIds:['g']})[1];assert.equal(plan.unplacedMust.length,0);assert.ok(plan.included.some(c=>c.id==='g'));assert.equal(evaluatePlan(plan,{...settings,mustIds:['g']}).must.covered,1);
});
test('must visits do not exhaust recommendations; independent three-day plan exists without wishes',()=>{
 const candidates=Array.from({length:12},(_,i)=>p('p'+i,'历史建筑'+i,39.9+i*.002));
 for(const ids of [[],['p0','p1']]){const plan=generateItineraries(candidates,{...settings,mustIds:ids})[1];assert.equal(plan.unplacedMust.length,0);assert.ok(plan.days.every(d=>d.items.length>=2));assert.ok(plan.days.flatMap(d=>d.items).length>ids.length);assert.ok(plan.days.every(d=>!d.conflicts.length));}
});
test('quality identifies sparse days, missing requirements and duplicate sites separately',()=>{
 const place=p('p','城市公园',39.9,116.4,'公园'),d={...scheduleDay([place],settings,'balanced'),date:settings.date};
 const q=evaluatePlan({days:[d,d],included:[]},{...settings,mustIds:['missing']});assert.ok(q.issues.some(i=>i.code==='sparse'));assert.ok(q.issues.some(i=>i.code==='duplicate'));assert.ok(q.issues.some(i=>i.code==='missingMust'));assert.ok(q.days[0].unknownHours);assert.ok(!Object.hasOwn(q,'totalScore'));
});
test('restaurant search skips closed nearest option, distinguishes recommended and reserved meals',()=>{
 const attraction=p('a','历史建筑'),closed={...p('closed','餐厅',39.9171,116.397,'餐厅'),openingHoursByDate:{[settings.date]:[]}},open=p('open','餐厅二',39.9172,116.397,'餐厅');
 const d=scheduleDay([attraction],settings,'balanced',[closed,open]);assert.ok(d.events.some(e=>e.mealType==='recommended'&&e.place.id==='open'));assert.ok(d.events.some(e=>e.mealType==='reservation'&&!e.place));assert.ok(!d.events.some(e=>e.place?.id==='closed'));
});
test('interest and subtype diversity have explicit heuristic components, not fabricated reviews',()=>{
 const museum=p('m','博物馆',39.9,116.4,'博物馆'),a=recommendationValue(museum,settings),b=recommendationValue(museum,settings,[museum]);assert.ok(a.interest>0);assert.ok(a.score>b.score);assert.equal(a.ratingUsed,false);
});
test('bounded cross-day relocation fills an empty date without deleting a must visit',()=>{
 const a=p('a','历史建筑'),b=p('b','历史建筑二');const days=[{...scheduleDay([a,b],settings,'balanced'),date:settings.date},{...scheduleDay([],{...settings,date:'2026-11-21'},'balanced'),date:'2026-11-21'}];
 improveDays(days,{...settings,mustIds:['a']},'balanced',scheduleDay,()=>({score:0}));assert.ok(days.every(d=>d.items.length===1));assert.deepEqual(days.flatMap(d=>d.items.map(i=>i.place.id)).sort(),['a','b']);
});
test('known closed dates and too-short windows remain explicit unsatisfied requirements',()=>{
 const park={...p('park','上海迪士尼乐园',31.144,121.657,'主题乐园')};const plan=generateItineraries([park],{...settings,mustIds:['park'],end:'12:00'})[1];assert.deepEqual(plan.unplacedMust,['park']);assert.ok(plan.quality.issues.some(i=>i.code==='missingMust'));
 const closed={...p('c','博物馆'),openingHoursByDate:Object.fromEntries(['2026-11-20','2026-11-21','2026-11-22'].map(d=>[d,[]]))};assert.deepEqual(generateItineraries([closed],{...settings,mustIds:['c']})[1].unplacedMust,['c']);
});
