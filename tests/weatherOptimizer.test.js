import test from 'node:test';import assert from 'node:assert/strict';
import {scheduleDay} from '../src/planner/planner.js';
import {optimizeWeather,assessWeather,exposure,eventWeather} from '../src/planner/weatherOptimizer.js';
const now=new Date('2026-10-16T00:00:00Z');
export const settings={start:'08:00',end:'20:00',walking:'high',party:'solo',interests:['NATURE','CULTURE'],mustIds:[],budget:1000};
export function makeWeather(wet=true){
 const time=[],temperature_2m=[],wind_speed_10m=[],precipitation_probability=[];
 for(let day=17;day<=19;day++)for(let hour=0;hour<24;hour++){time.push(`2026-10-${day}T${String(hour).padStart(2,'0')}:00`);temperature_2m.push(25);wind_speed_10m.push(10);precipitation_probability.push(wet&&hour===9?90:0);}
 return {timezone:'Asia/Shanghai',utc_offset_seconds:28800,fetchedAt:now.getTime()/1000,hourly:{time,temperature_2m,wind_speed_10m,precipitation_probability}};
}
function place(id,env,longitude=116.4){return {id,name:id,category:env==='outdoor'?'NATURE':'CULTURE',environment:env,latitude:39.9,longitude,subcategories:['CULTURE'],minimumDuration:60,estimatedDuration:90,price:0,openingHours:{weekly:Object.fromEntries(Array.from({length:7},(_,d)=>[d,[{start:'07:00',end:'21:00'}]]))}};}
export function plan(pace='balanced',known=true){
 const places=[place('park','outdoor'),place('museum','indoor',116.401)];if(!known)places.forEach(p=>delete p.openingHours);
 return {id:pace,days:[{...scheduleDay(places.map(place=>({place,duration:90})),settings,pace),day:1,date:'2026-10-17'}]};
}
test('all three paces: clear weather unchanged; rainy outdoor slot improves without changing durations',()=>{
 for(const pace of ['relaxed','balanced','efficient']){
  const original=plan(pace);assert.equal(optimizeWeather(original,settings,makeWeather(false),now).reason,'calm');
  const result=optimizeWeather(original,settings,makeWeather(),now);assert.ok(result.plan,JSON.stringify(result));assert.ok(result.after<result.before);assert.equal(result.plan.days[0].events.find(e=>e.id==='park').duration,90);assert.equal(original.days[0].events[0].id,'park');assert.equal(result.plan.days[0].conflicts.length,0);
 }
});
test('locked place position and times remain immutable, original not mutated',()=>{
 const original=plan(),json=JSON.stringify(original);const result=optimizeWeather(original,{...settings,mustIds:['park']},makeWeather(),now);assert.equal(result.reason,'noBetter');assert.equal(JSON.stringify(original),json);
});
test('unknown setting stays unknown; missing hours require acknowledgement rather than invented opening times',()=>{
 assert.equal(exposure({category:'CULTURE',name:'Museum?'}),'unknown');
 const result=optimizeWeather(plan('balanced',false),settings,makeWeather(),now);assert.ok(result.plan);assert.equal(result.unknownHours.length,2);
 const original=plan();original.days[0].events.find(e=>e.id==='park').place.environment='unknown';original.days[0].events.find(e=>e.id==='park').place.category='ATTRACTION';assert.equal(optimizeWeather(original,settings,makeWeather(),now).reason,'noBetter');
});
test('missing, partial, stale and out-of-range weather never creates proposals',()=>{
 for(const data of [null,{},makeWeather()]){const original=plan();if(data?.hourly)original.days[0].date='2099-01-01';assert.equal(optimizeWeather(original,settings,data,now).reason,'missing');}
 const data=makeWeather();data.hourly.temperature_2m[8]=null;assert.equal(optimizeWeather(plan(),settings,data,now).reason,'missing');
 const stale=makeWeather();stale.fetchedAt-=1801;assert.equal(optimizeWeather(plan(),settings,stale,now).reason,'missing');
});
test('rain refers to preceding hour, high heat and wind are detected, indoor weight is lower',()=>{
 const data=makeWeather();data.hourly.temperature_2m[8]=37;data.hourly.wind_speed_10m[8]=48;
 const e=plan().days[0].events[0],out=eventWeather(e,'2026-10-17',data,now),inside=eventWeather({...e,place:{...e.place,environment:'indoor'}},'2026-10-17',data,now);
 assert.deepEqual(out.reasons,['rain','heat','wind']);assert.ok(inside.score<out.score);assert.equal(inside.affected,false);
});
test('closed target hours forbid otherwise beneficial reorder',()=>{
 const original=plan();original.days[0].events.find(e=>e.id==='park').place.openingHours={weekly:{6:[{start:'08:00',end:'09:30'}]}};
 assert.equal(optimizeWeather(original,settings,makeWeather(),now).reason,'noBetter');
});
test('cross-day swap is fallback, needs known opening times and preserves place set',()=>{
 const a=place('park','outdoor'),b=place('museum','indoor');
 const original={id:'balanced',days:[{...scheduleDay([{place:a,duration:90}],settings,'balanced'),day:1,date:'2026-10-17'},{...scheduleDay([{place:b,duration:90}],settings,'balanced'),day:2,date:'2026-10-18'}]};
 const data=makeWeather(false);data.hourly.precipitation_probability.fill(90,0,24);
 const result=optimizeWeather(original,settings,data,now);assert.ok(result.plan);assert.equal(result.plan.days[1].events[0].id,'park');
 delete a.openingHours;assert.equal(optimizeWeather(original,settings,data,now).reason,'noBetter');
});
