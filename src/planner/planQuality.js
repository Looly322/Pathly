import {samePlace} from './identity.js';
import {containedBy} from './visitDuration.js';
import {eventWeather} from './weatherRisk.js';
// Independent diagnostics: hard failures cannot be concealed by an aggregate score.
export function evaluatePlan(plan,settings){
 const issues=[],seen=[];const available=Math.max(1,toMinutes(settings.end)-toMinutes(settings.start));
 const days=plan.days.map(d=>{
  const activities=d.events.filter(e=>e.kind==='ACTIVITY'),visiting=activities.reduce((n,e)=>n+e.duration,0);
  const travel=d.events.reduce((n,e)=>n+(e.travel?.minutes||0),0),legs=d.events.filter(e=>e.travel?.minutes>0);
  const unknownHours=activities.filter(e=>d.warnings?.some(w=>w.id===e.id&&w.code==='unknownHours')).length;
  const risk=activities.filter(e=>settings.weather&&eventWeather(e,d.date,settings.weather).affected).length;
  const meals=d.events.filter(e=>e.kind==='MEAL');
  for(const e of activities){if(seen.some(p=>samePlace(p,e.place)||containedBy(p,e.place)||containedBy(e.place,p)))issues.push({code:'duplicate',date:d.date,name:e.place.name,severity:'error'});seen.push(e.place);}
  if(d.conflicts.length)issues.push({code:'constraints',date:d.date,severity:'error',details:d.conflicts});
  if(visiting<180&&!activities.some(e=>e.place.visit?.fullDay)&&available>=420)issues.push({code:'sparse',date:d.date,severity:'warning',minutes:visiting});
  if(travel>180||travel/available>.35)issues.push({code:'longTravel',date:d.date,severity:'warning',minutes:travel});
  return {date:d.date,activities:activities.length,visiting,travel,utilization:Math.round((visiting+meals.reduce((n,e)=>n+e.duration,0)+travel)/available*100),travelShare:Math.round(travel/available*100),interestMatches:activities.filter(e=>(e.place.subcategories||[]).some(c=>settings.interests.includes(c))).length,unknownHours,weatherRisks:risk,realLegs:legs.filter(e=>!e.travel.estimated).length,estimatedLegs:legs.filter(e=>e.travel.estimated).length,meals:{specified:meals.filter(e=>e.mealType==='specified').length,recommended:meals.filter(e=>e.place&&e.mealType!=='specified').length,reserved:meals.filter(e=>!e.place).length},hotelRoundTrip:!settings.hotel||d.events[0]?.kind==='HOTEL'&&d.events.at(-1)?.kind==='HOTEL'};
 });
 const covered=new Set(plan.days.flatMap(d=>d.events.filter(e=>e.place).flatMap(e=>[e.id,...(e.place.duplicateIds||[])])));
 for(const child of plan.included||[])if(covered.has(child.parentId))covered.add(child.id);
 const missing=(settings.mustIds||[]).filter(id=>!covered.has(id));
 missing.forEach(id=>issues.push({code:'missingMust',id,severity:'error'}));
 return {basis:'planning-rule',days,issues,must:{total:(settings.mustIds||[]).length,covered:(settings.mustIds||[]).length-missing.length,missing},totalTravel:days.reduce((n,d)=>n+d.travel,0),visitSpread:days.length?Math.max(...days.map(d=>d.visiting))-Math.min(...days.map(d=>d.visiting)):0};
}
function toMinutes(t){const [h,m]=t.split(':').map(Number);return h*60+m;}
