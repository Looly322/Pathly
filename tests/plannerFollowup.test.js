import test from 'node:test';import assert from 'node:assert/strict';
import {nearbyRouteCandidates,candidateRoutePairs} from '../src/planner/routeCandidates.js';
import {collectRoutePairs} from '../src/services/planningTransport.js';
import {routeKey} from '../src/planner/travel.js';
import {scheduleDay,fillDay} from '../src/planner/planner.js';
const p=(id,lon=121.46,duration=135,type='museum')=>({id,name:id,longitude:lon,latitude:31.23,category:'CULTURE',subcategories:['CULTURE'],estimatedDuration:duration,minimumDuration:duration,visit:{type,range:[duration,duration,duration]}});
const settings={date:'2026-11-20',start:'09:00',end:'20:00',interests:['CULTURE'],pace:'relaxed',walking:'medium',budget:1000,mustIds:[],hotel:p('hotel',121.1)};
const route=(seconds=1800)=>({seconds,meters:5000,mode:'transit',source:'amap',walkingMeters:200});
test('alternative shortlist accounts for visit scope, bounds count, excludes duplicates and whole-day parks',()=>{
 const a=p('a'),day={items:[{place:a}],gaps:[{start:945,end:1050}]};
 const b=p('short',121.48,75,'religious'),large=p('large',121.461,240),park={...p('park'),visit:{fullDay:true}};
 const chosen=nearbyRouteCandidates(day,[a,large,b,park],settings,1);assert.equal(chosen[0].id,'short');assert.equal(candidateRoutePairs(day,chosen,settings).length,4);
 assert.deepEqual(nearbyRouteCandidates({items:[{place:park}]},[b],settings),[]);
});
test('route queries dedupe edges, retain direction, use recent cache and enforce request cap',async()=>{
 const a=p('a'),b=p('b',121.48),c=p('c',121.49),calls=[];
 const routes=await collectRoutePairs([[a,b],[a,b],[b,a],[a,c]],{countryCode:'CN'},settings,()=>true,{maxRequests:2,query:async(from,to)=>{calls.push(from.id+'>'+to.id);return {options:[route()]};}});
 assert.deepEqual(calls,['a>b','b>a']);assert.equal(Object.keys(routes).length,2);
 await collectRoutePairs([[a,b]],{countryCode:'CN'},{...settings,routes},()=>true,{query:()=>{throw Error('cached edge was queried');}});
});
test('failed transit never silently becomes a five-hour walk; overseas/cancelled queries do not dispatch',async()=>{
 const pairs=[[p('a'),p('b',121.48)]];let count=0;const query=async()=>{count++;return {options:[{mode:'walking',meters:20000,seconds:18000}]};};
 assert.deepEqual(await collectRoutePairs(pairs,{countryCode:'CN'},settings,()=>true,{query}),{});
 await collectRoutePairs(pairs,{countryCode:'JP'},settings,()=>true,{query});await collectRoutePairs(pairs,{countryCode:'CN'},settings,()=>false,{query});assert.equal(count,1);
});
test('shortlisted real traffic unlocks a feasible second stop without shortening visits',async()=>{
 const hotel=p('hotel',121.05),museum=p('museum',121.46,135),temple=p('temple',121.445,75,'religious');
 const s={...settings,hotel,routes:{[routeKey(hotel,museum)]:{...route(6360),fetchedAt:Date.now()},[routeKey(museum,hotel)]:{...route(6420),fetchedAt:Date.now()}}};
 const day={...scheduleDay([museum],s,'relaxed'),date:s.date};
 const extra=await collectRoutePairs(candidateRoutePairs(day,[temple],s),{countryCode:'CN'},s,()=>true,{query:async(a,b)=>({options:[route(a===hotel||b===hotel?6120:1620)]})});
 const filled=fillDay(day,[temple],{...s,routes:{...s.routes,...extra}},'relaxed');assert.equal(filled.items.length,2);assert.deepEqual(filled.conflicts,[]);assert.equal(filled.items.find(i=>i.place.id==='museum').duration,135);assert.equal(filled.items.find(i=>i.place.id==='temple').duration,75);
});
test('generic meals preserve actual journey minutes and an honest nearby-location hint',()=>{
 const s={...settings,hotel:p('hotel',121.05)},museum=p('museum',121.46,135);const day=scheduleDay([museum],s,'relaxed');const meal=day.events.find(e=>e.slot==='LUNCH');assert.ok(meal.travel.minutes>0);assert.equal(meal.place,null);assert.equal(meal.foodCandidate.near.name,museum.name);
});
