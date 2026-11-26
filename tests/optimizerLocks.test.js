import test from 'node:test';
import assert from 'node:assert/strict';
import {improveDays} from '../src/planner/improveDays.js';
const makeDay=(date,ids,travel=100)=>({date,items:ids.map(id=>({place:{id,category:'CULTURE'},duration:60})),events:ids.map((id,i)=>({id,kind:'ACTIVITY',start:540+i*90,end:600+i*90})),fatigue:{travel},conflicts:[]});
// Deliberately attractive proposals verify that constraints override traffic savings.
const scheduler=(items)=>({...makeDay('',items.map(i=>i.place.id),1),items});
test('route optimizer retains locked date, time, duration and order despite cheaper alternatives',()=>{
 const days=[makeDay('2026-11-20',['a','b']),makeDay('2026-11-21',['c','d'])];
 const before=structuredClone(days[0]);
 improveDays(days,{lockedSlots:{b:{date:days[0].date,start:630,end:690}}},'balanced',scheduler,()=>({score:0}));
 assert.deepEqual(days[0],before);
});
test('explicitly preserved days remain intact even without a must-visit identifier',()=>{
 const days=[makeDay('2026-11-20',['a','b']),makeDay('2026-11-21',['c','d'])];
 const before=structuredClone(days[0]);
 improveDays(days,{preservedDays:{[days[0].date]:days[0]}},'balanced',scheduler,()=>({score:0}));
 assert.deepEqual(days[0],before);
});
test('unlocked days still receive route optimization',()=>{
 const days=[makeDay('2026-11-20',['a','b'])];
 improveDays(days,{},'balanced',scheduler,()=>({score:0}));
 assert.equal(days[0].fatigue.travel,1);
 assert.deepEqual(days[0].items.map(i=>i.place.id),['b','a']);
});
