import {preservesLocks} from './feasibility.js';
// Bounded moves and swaps share the normal scheduler: no shortened visits or relaxed constraints.
export function improveDays(days,settings,pace,scheduleDay,risk){
 const visiting=d=>d.events.filter(e=>e.kind==='ACTIVITY').reduce((n,e)=>n+(e.duration||0),0);
 const score=d=>d.fatigue.travel+d.events.reduce((n,e)=>n+(e.travel?.km||0)*2+(e.kind==='ACTIVITY'&&settings.weather?risk(e,d.date,settings.weather).score:0),0)+Math.max(0,210-visiting(d))*.8;
 const pinned=d=>Boolean(settings.preservedDays?.[d.date])||d.events.some(e=>Boolean(settings.lockedSlots?.[e.id]));
 const reschedule=(d,items)=>({...d,...scheduleDay(items,{...settings,planningDate:d.date,assignedMeals:d.mealAssignments},pace,d.events.filter(e=>e.kind==='MEAL'&&e.place).map(e=>e.place))});
 const valid=(a,b)=>preservesLocks(a,b,settings)&&!b.conflicts.length&&b.items.filter(i=>i.place.category==='CAFE').length<=1&&a.events.filter(e=>e.kind==='MEAL').map(e=>e.place?.id||e.slot).join('|')===b.events.filter(e=>e.kind==='MEAL').map(e=>e.place?.id||e.slot).join('|');
 let trials=0;const limit=180;
 for(let d=0;d<days.length;d++)if(!pinned(days[d])){
  for(let i=0;i<days[d].items.length;i++)for(let j=i+1;j<days[d].items.length;j++){
   if(++trials>limit)return days;
   const items=[...days[d].items];[items[i],items[j]]=[items[j],items[i]];const trial=reschedule(days[d],items);
   if(valid(days[d],trial)&&score(trial)+.01<score(days[d]))days[d]=trial;
  }
 }
 for(let pass=0;pass<2;pass++)for(let a=0;a<days.length;a++)for(let b=0;b<days.length;b++){
  if(a===b||pinned(days[a])||pinned(days[b]))continue;
  for(let i=0;i<days[a].items.length;i++){
   // Transfer an existing activity to a sparse day, preserving the entire place set.
   for(let j=0;j<=days[b].items.length;j++){
    if(++trials>limit)return days;
    const left=[...days[a].items],right=[...days[b].items];right.splice(j,0,left.splice(i,1)[0]);
    const x=reschedule(days[a],left),y=reschedule(days[b],right);
    if(valid(days[a],x)&&valid(days[b],y)&&score(x)+score(y)+1<score(days[a])+score(days[b])){days[a]=x;days[b]=y;break;}
   }
   if(i>=days[a].items.length)continue;
   for(let j=0;j<days[b].items.length;j++){
    if(++trials>limit)return days;
    const left=[...days[a].items],right=[...days[b].items];[left[i],right[j]]=[right[j],left[i]];
    const x=reschedule(days[a],left),y=reschedule(days[b],right);
    if(valid(days[a],x)&&valid(days[b],y)&&score(x)+score(y)+1<score(days[a])+score(days[b])){days[a]=x;days[b]=y;}
   }
  }
 }
 return days;
}
