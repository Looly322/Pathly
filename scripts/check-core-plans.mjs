import fs from 'node:fs';
import {normalizePlace} from '../src/planner/place.js';
import {generateItineraries} from '../src/planner/planner.js';
const cases=JSON.parse(fs.readFileSync('backend/core-data-validation.json','utf8'));
const output=[];
for(const data of cases.filter(x=>x.places?.length)){
 const settings={date:'2026-10-01',days:data.days,start:'09:00',end:'20:00',budget:500,interests:data.interests,walking:'medium',party:'solo',mustIds:[]};
 const places=data.places.map(p=>normalizePlace(p,data.destination));
 const plans=generateItineraries(places,settings);
 const result={city:data.query,available:places.length,categories:[...new Set(places.map(p=>p.category))],variants:plans.map(plan=>({pace:plan.id,days:plan.days.map(d=>({day:d.day,activities:d.fatigue.activities,meals:d.events.filter(e=>e.kind==='MEAL').length,rest:d.events.filter(e=>e.kind==='REST').length,fatigue:d.fatigue.score,conflicts:d.conflicts,events:d.events.map(e=>({name:e.place?.name||e.slot||'REST',kind:e.kind,start:e.start,end:e.end,matches:e.matches,foodCandidate:e.foodCandidate}))}))}))};
 output.push(result);console.log(data.query,places.length,JSON.stringify(result.variants.map(p=>({pace:p.pace,days:p.days.map(d=>d.activities),conflicts:p.days.flatMap(d=>d.conflicts)}))));
}
fs.writeFileSync('backend/core-plan-validation.json',JSON.stringify(output,null,2));
