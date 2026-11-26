import {visitDuration,withVisitProfile,collapseContained,containedBy} from './visitDuration.js';
import {assignRestaurants} from './dining.js';
import {recommendationValue} from './recommendationValue.js';
import {evaluatePlan} from './planQuality.js';
import {dedupePlaces,samePlace} from './identity.js';
import {improveDays} from './improveDays.js';
import {travelBetween} from './travel.js';
import {preservesLocks,openingSlot,validateEvents} from './feasibility.js';
import {eventWeather} from './weatherRisk.js';
import {haversineDistance} from '../utils/geo.js';
import {orderDailyRoute} from './routeOrdering.js';
import {validPlace} from './place.js';
export const PACES={relaxed:{max:3,stay:1.15,buffer:20,rest:30,fatigue:58},balanced:{max:4,stay:1,buffer:15,rest:25,fatigue:70},efficient:{max:5,stay:.9,buffer:10,rest:20,fatigue:80}};
export const SCORE_WEIGHTS={interest:45,diversity:24,wish:500,distance:7,fatigue:1.2,value:10};
export const minutes=time=>time.split(':').reduce((h,m)=>Number(h)*60+Number(m));
export const clock=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
export const roundStart=value=>Math.ceil(value/15)*15;
const distance=(a,b)=>a&&b?haversineDistance(a,b):0;
export function preferenceScore(place,settings,selected=[]){
  return recommendationValue(place,settings,selected).score+10+(settings.mustIds?.includes(place.id)?500:0)-Math.min(30,travelBetween(selected.at(-1)||settings.hotel,place,settings).minutes*.3);
}
export function fatigueCost(events){
  let continuous=0,longest=0,walking=0,travel=0,large=0,activities=0,backtracking=0;
  const places=[];
  for(const e of events){
    travel+=e.travel?.minutes||0;walking+=e.travel?.walking||0;
    if(e.kind!=='ACTIVITY'){continuous=0;continue;}
    activities++;large+=e.place.large?1:0;continuous+=e.duration+(e.travel?.minutes||0);longest=Math.max(longest,e.internalBreaks?Math.min(150,e.duration):continuous);if(e.internalBreaks)continuous=0;
    walking+=e.place.category==='NATURE'?1.5:e.place.large?1:e.place.category==='SHOPPING'?1:.5;
    places.push(e.place);
  }
  for(let i=2;i<places.length;i++) if(distance(places[i-2],places[i])<1.5&&distance(places[i-1],places[i])>4) backtracking++;
  const hasRest=events.some(e=>e.kind==='REST'||e.internalBreaks);
  const score=Math.min(100,Math.round(activities*5+walking*3+travel*.1+large*4+Math.max(0,longest-180)*.2+backtracking*12+(!hasRest&&activities>2?12:0)));
  return {score,walking:+walking.toFixed(1),travel,large,longest,backtracking,activities};
}
export function mealWindows(settings){
  const start=minutes(settings.start),end=minutes(settings.end);
  return [{slot:'LUNCH',start:690,end:810,preferred:720},{slot:'DINNER',start:1050,end:1200,preferred:1080}]
    .map(w=>{const custom=settings.mealWindows?.[w.slot];const a=custom?.start?minutes(custom.start):w.start,b=custom?.end?minutes(custom.end):w.end;return {...w,start:Math.max(a,start),end:Math.min(b,end)};}).filter(w=>w.end-w.start>=30);
}
export function scheduleDay(items,settings,pace,foodPlaces=[]){
  const scheduleConflicts=[];if(items.length>1&&items.some(i=>(i.place||i).visit?.fullDay))scheduleConflicts.push('dedicatedDay');const style=PACES[pace],events=[],end=minutes(settings.end),windows=mealWindows(settings),usedFood=new Set(items.map(i=>(i.place||i).id));
  let cursor=minutes(settings.start),last=settings.hotel||settings.origin||null,continuous=0,restDone=false;
  const push=(event,start,duration)=>{start=roundStart(start);events.push({...event,start,end:start+duration,duration});cursor=start+duration;};
  const rest=()=>{if(windows.length&&roundStart(cursor+style.rest)+Math.min(60,windows[0].end-windows[0].start)>windows[0].end)meal(windows.shift());push({id:'rest-'+events.length,kind:'REST',activityType:'REST',reason:'rest',travel:{minutes:0}},cursor,style.rest);continuous=0;restDone=true;};
  function meal(w,near=null){
    let duration=Math.min(60,w.end-w.start);
    const assigned=settings.assignedMeals?.[w.slot];let candidate=assigned||null,route={minutes:0,km:0,walking:0,estimated:true};
    if(!assigned&&last){
      const anchor=near||last;
      const options=foodPlaces.filter(p=>!usedFood.has(p.id)&&distance(anchor,p)<1.5).map(p=>({p,route:travelBetween(last,p,settings)})).sort((a,b)=>a.route.minutes-b.route.minutes);
      for(const option of options){
        const at=roundStart(Math.max(cursor+option.route.minutes,w.start,Math.min(w.preferred,w.end-duration)));
        const availableDuration=Math.min(duration,w.end-at);
        if(availableDuration<30)continue;
        const opening=openingSlot(option.p,settings.planningDate||settings.date,at,availableDuration);
        if(option.route.minutes<=travelBetween(last,anchor,settings).minutes+20&&opening.status!=='closed'&&roundStart(opening.start)+availableDuration<=w.end){candidate=option.p;route=option.route;duration=availableDuration;break;}
      }
    }
    if(assigned)route=travelBetween(last,assigned,settings);
    // If dining at the last stop would prevent a timely return, dine near the hotel.
    // Never relocate a user-specified restaurant. The return journey is still charged.
    if(!assigned&&settings.hotel&&w.slot==='DINNER'&&roundStart(w.start+30+travelBetween(candidate||last,settings.hotel,settings).minutes)>end){candidate=null;near=settings.hotel;}
    if(!candidate) route=near?travelBetween(last,near,settings):{minutes:0,km:0,walking:0,estimated:true};
    const returnMinutes=settings.hotel&&w.slot==='DINNER'?travelBetween(candidate||near||last,settings.hotel,settings).minutes:0;
    const latest=Math.min(w.end,end-returnMinutes);
    let start=roundStart(Math.max(cursor+route.minutes,w.start,Math.min(near?Math.max(w.start,cursor+route.minutes):w.preferred,latest-duration)));
    duration=Math.max(30,Math.min(duration,latest-start));
    if(candidate)start=roundStart(openingSlot(candidate,settings.planningDate||settings.date,start,duration).start);
    push({id:w.slot,kind:'MEAL',activityType:'FOOD',slot:w.slot,place:candidate||null,mealType:assigned?'specified':candidate?'recommended':'reservation',foodCandidate:{category:'FOOD',near:(near||last)?{id:(near||last).id,name:(near||last).name,latitude:(near||last).latitude,longitude:(near||last).longitude}:null,matchedId:candidate?.id||null},reason:settings.interests.includes('FOOD')?'foodMeal':'meal',travel:route,window:w},start,duration);
    if(candidate){usedFood.add(candidate.id);last=candidate;}else if(near)last=near;continuous=0;
  }
  if(settings.hotel)push({id:'hotel-departure',kind:'HOTEL',activityType:'HOTEL',place:settings.hotel,travel:{minutes:0},reason:'hotelDeparture'},cursor,0);
  for(const item of items){
    const place=item.place||item;
    let duration=visitDuration(place,settings,pace,item);
    const internal=place.visit?.internalBreaks||(duration>=240&&['majorMuseum','museum','historicComplex'].includes(place.visit?.type));
    let route=travelBetween(last,place,settings);
    if(!internal&&windows.length&&roundStart(Math.max(cursor,place.category==='NIGHTLIFE'?1080:cursor)+route.minutes+(last?style.buffer:0))+duration>windows[0].end-30) {meal(windows.shift(),events.some(e=>e.kind==='ACTIVITY')?null:place);route=travelBetween(last,place,settings);}
    if(!internal&&continuous+duration+route.minutes>180&&continuous>0){rest();route=travelBetween(last,place,settings);}
    if(place.category==='NIGHTLIFE')cursor=Math.max(cursor,1080);
    let start=roundStart(cursor+route.minutes+(last?style.buffer:0));
    const slot=openingSlot(place,settings.planningDate||settings.date,start,duration);start=roundStart(slot.start);
    const pinned=settings.lockedSlots?.[place.id];if(pinned){if(start>pinned.start)scheduleConflicts.push('transport');start=pinned.start;duration=pinned.end-pinned.start;}
    const matches=place.subcategories.filter(i=>settings.interests.includes(i));
    if(internal){for(let n=windows.length-1;n>=0;n--){const w=windows[n];if(w.start<start+duration&&w.end>start){if(settings.assignedMeals?.[w.slot])scheduleConflicts.push('parkMeal');else windows.splice(n,1);}}restDone=true;}
    push({internalBreaks:!!internal,id:place.id,kind:'ACTIVITY',activityType:place.category,place,travel:route,matches,reason:settings.mustIds?.includes(place.id)?'must':matches.length?'interest':'nearby'},start,duration);
    continuous+=route.minutes+duration;last=place;
  }
  if(items.length&&!restDone)rest();
  for(const w of windows)meal(w);
  if(settings.hotel){const route=travelBetween(last,settings.hotel,settings);push({id:'hotel-return',kind:'HOTEL',activityType:'HOTEL',place:settings.hotel,travel:route,reason:'hotelReturn'},cursor+route.minutes,0);}
  const fatigue=fatigueCost(events);
  const people=Math.max(1,Number(settings.people)||1);
  const knownCost=events.reduce((sum,e)=>sum+(e.place?.price!=null&&settings.currency&&e.place?.priceCurrency===settings.currency?e.place.price*people:0)+(Number.isFinite(e.travel?.cost)&&e.travel.currency===settings.currency?e.travel.cost*people:0),0);
  const reserve=events.reduce((sum,e)=>sum+(e.kind==='MEAL'?60:e.kind==='ACTIVITY'&&(e.place.price==null||e.place.priceCurrency!==settings.currency)?40:0)+(e.travel?.minutes&&!(Number.isFinite(e.travel.cost)&&e.travel.currency===settings.currency)?10:0),0);
  const validation=validateEvents(events,settings);const conflicts=[...validation.conflicts,...scheduleConflicts];
  if(cursor>end)conflicts.push('time');
  if(events.some(e=>e.window&&(e.start<e.window.start||e.end>e.window.end)))conflicts.push('mealWindow');
  const walkingLimit={low:4,medium:7,high:11}[settings.walking]||7;
  if(fatigue.walking>walkingLimit)validation.warnings.push({code:'walking'});
  if(fatigue.score>style.fatigue||fatigue.longest>210)validation.warnings.push({code:'fatigue'});
  if(knownCost>settings.budget)conflicts.push('budget');else if(knownCost+reserve>settings.budget)validation.warnings.push({code:'budget'});
  if(items.length>style.max)validation.warnings.push({code:'count'});
  const available=end-minutes(settings.start);
  const occupied=events.reduce((sum,e)=>sum+e.duration+(e.travel?.minutes||0),0);
  const gaps=events.slice(1).map((event,index)=>({start:events[index].end,end:event.start-(event.travel?.minutes||0)})).filter(g=>g.end-g.start>=60);
  const free=Math.max(0,end-cursor)+gaps.reduce((sum,g)=>sum+g.end-g.start,0);
  const stability=Math.max(0,Math.min(100,Math.round(100-fatigue.score*.45-conflicts.length*15+Math.min(10,free/20))));
  return {gaps,mealAssignments:settings.assignedMeals||{},events,fatigue,knownCost,reserve,warnings:validation.warnings,conflicts:[...new Set(conflicts)],overflow:Math.max(0,cursor-end),free,stability,usedFood:[...usedFood],items:items.map(i=>({place:i.place||i,duration:events.find(e=>e.id===(i.place||i).id)?.duration||i.duration}))};
}
// Try every insertion position against the same scheduler, including traffic, meals and locks.
export function fillDay(day,candidates,settings,pace,food=[]){
 let next=day;
 if(next.conflicts.length||next.items.some(i=>i.place.visit?.fullDay))return next;
 const local={...settings,planningDate:day.date,assignedMeals:day.mealAssignments};
 const pool=dedupePlaces(candidates,settings.mustIds).filter(p=>validPlace(p)&&p.planningEligible!==false&&!p.isOutskirts&&!['FOOD','CAFE'].includes(p.category)&&(p.category!=='ENTERTAINMENT'||settings.interests.includes('ENTERTAINMENT')||settings.mustIds?.includes(p.id)));
 while(next.items.length<PACES[pace].max){
  let best=null;
  for(const p of pool){
   if(next.items.some(i=>samePlace(i.place,p)||containedBy(p,i.place)||containedBy(i.place,p)))continue;
   for(let index=0;index<=next.items.length;index++){
    const items=[...next.items];items.splice(index,0,{place:p});
    const trial=scheduleDay(items,local,pace,food);
    if(trial.conflicts.length||!preservesLocks(next,trial,local))continue;
    const addedTravel=trial.fatigue.travel-next.fatigue.travel;
    if(next.items.length&&addedTravel>(pace==='relaxed'?60:90))continue;
    const weather=trial.events.filter(e=>e.kind==='ACTIVITY').reduce((n,e)=>n+(settings.weather?eventWeather(e,day.date,settings.weather).score:0),0);
    const score=preferenceScore(p,settings,next.items.map(i=>i.place))-Math.max(0,addedTravel)*.5-weather;
    if(!best||score>best.score)best={...trial,score};
   }
  }
  if(!best)break;
  const {score,...schedule}=best;next={...next,...schedule};
 }
 return {...next,underfilled:next.items.length<2&&!next.items.some(i=>i.place.visit?.fullDay)};
}
export function generateItineraries(candidatePlaces,settings){
  settings={...settings,origin:settings.hotel||settings.origin};
  const deduped=dedupePlaces(candidatePlaces.map(p=>p.visit||!p.source?p:withVisitProfile(p)).filter(p=>validPlace(p)&&(p.planningEligible!==false||settings.mustIds?.includes(p.id))),settings.mustIds);
 const {places:unique,covered}=collapseContained(deduped,settings.mustIds||[]);
 const originalMust=(settings.mustIds||[]).map(id=>deduped.find(p=>p.duplicateIds.includes(id))?.id||id);
 settings={...settings,mustIds:[...new Set(originalMust.map(id=>covered.find(c=>c.id===id)?.parentId||id))]};
  return Object.keys(PACES).map(pace=>{
    const used=new Set(),days=[],food=unique.filter(p=>p.category==='FOOD'&&!settings.mustIds?.includes(p.id));
    const core=unique.filter(p=>(p.category!=='ENTERTAINMENT'||settings.interests.includes('ENTERTAINMENT')||settings.mustIds?.includes(p.id))&&(!p.isOutskirts||settings.mustIds?.includes(p.id))&&(p.category!=='FOOD'||settings.mustIds?.includes(p.id))&&(p.category!=='CAFE'||settings.interests.includes('FOOD')||settings.mustIds?.includes(p.id)));
    for(let day=0;day<settings.days;day++){
      const date=new Date(settings.date+'T12:00:00');date.setDate(date.getDate()+day);
      const dayDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const daySettings={...settings,planningDate:dayDate};
      const preserved=settings.preservedDays?.[dayDate];
      if(preserved){const fixed=scheduleDay(preserved.items,{...daySettings,assignedMeals:preserved.mealAssignments},pace,food.filter(p=>!used.has(p.id)));fixed.events.filter(e=>e.place).forEach(e=>used.add(e.place.id));days.push({...fixed,day:day+1,date:dayDate,underfilled:fixed.fatigue.activities<2});continue;}
      const reserved=new Set(Object.values(settings.preservedDays||{}).flatMap(d=>d.events.filter(e=>e.place).map(e=>e.place.id)));
      const available=core.filter(p=>!used.has(p.id)&&!reserved.has(p.id));
      // 将有限候选分配到各天，避免第一天耗尽候选、后续重复景点。
      const requiredCount=available.filter(p=>settings.mustIds?.includes(p.id)).length;
      const max=Math.max(Math.min(PACES[pace].max,Math.ceil(available.length/(settings.days-day))),Math.ceil(requiredCount/(settings.days-day)));
      let selected=[],schedule=scheduleDay([],daySettings,pace,food);
      while(selected.length<max){
        const ranked=available.filter(p=>!selected.some(s=>s.id===p.id)&&(settings.mustIds?.includes(p.id)||p.category!=='CAFE'||!selected.some(s=>s.category==='CAFE'))).map(p=>({p,score:preferenceScore(p,settings,selected)})).sort((a,b)=>b.score-a.score);
        let best=null;const hasMust=ranked.some(e=>settings.mustIds?.includes(e.p.id));
        for(const entry of ranked){
          // 以当日首站为空间锚点聚类；下一天从未选候选中重新取种子。
          if(!settings.mustIds?.includes(entry.p.id)&&['installation','wall_painting','sculptures','fountains'].includes(entry.p.featureType)&&selected.some(p=>['installation','wall_painting','sculptures','fountains'].includes(p.featureType)))continue;
          if(selected.length&&travelBetween(selected.at(-1),entry.p,daySettings).minutes>(pace==='relaxed'?60:90)&&!settings.mustIds?.includes(entry.p.id))continue;
          const trial=scheduleDay([...selected,entry.p],daySettings,pace,food.filter(p=>!used.has(p.id)));
          if(trial.conflicts.length)continue;
          const weatherPenalty=settings.weather?trial.events.filter(e=>e.kind==='ACTIVITY').reduce((n,e)=>n+eventWeather(e,dayDate,settings.weather).score,0):0;
          const value=entry.score-trial.fatigue.score*SCORE_WEIGHTS.fatigue-weatherPenalty+(hasMust&&settings.mustIds?.includes(entry.p.id)?100000:0);
          if(!best||value>best.value)best={place:entry.p,schedule:trial,value};
        }
        if(!best)break;
        selected.push(best.place);schedule=best.schedule;
      }
      const ordered=orderDailyRoute(selected,{cost:(a,b)=>travelBetween(a,b,daySettings).minutes,origin:settings.hotel});
      const optimized=scheduleDay(ordered,daySettings,pace,food.filter(p=>!used.has(p.id)));
      if(!optimized.conflicts.length){selected=ordered;schedule=optimized;}
      selected.forEach(p=>used.add(p.id));schedule.usedFood.forEach(id=>used.add(id));
      days.push({...schedule,day:day+1,date:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,underfilled:selected.length<2&&!selected.some(p=>p.visit?.fullDay),availableCount:available.length});
    }
    improveDays(days,settings,pace,scheduleDay,eventWeather);
    const unplacedRestaurants=assignRestaurants(days,settings.restaurants,settings,pace,scheduleDay);
    for(let index=0;index<days.length;index++){
      if(settings.preservedDays?.[days[index].date])continue;
      const taken=new Set(days.flatMap(d=>d.events.filter(e=>e.place).map(e=>e.place.id)));
      days[index]=fillDay(days[index],core.filter(p=>!taken.has(p.id)),settings,pace,food.filter(p=>!taken.has(p.id)));
    }
    improveDays(days,settings,pace,scheduleDay,eventWeather);
    const planned=new Set(days.flatMap(d=>d.events.filter(e=>e.place).map(e=>e.place.id)));
    const included=covered.filter(p=>planned.has(p.parentId));for(const child of included)planned.add(child.id);
    const unplacedMust=(settings.mustIds||[]).filter(id=>!planned.has(id));
    const unplacedDetails=unplacedMust.map(id=>{const p=unique.find(p=>p.id===id);return {id,name:p?.name||id,attempts:days.map(d=>{if(!p)return {date:d.date,conflicts:['missingPlace'],overflow:0};const trial=scheduleDay([p],{...settings,planningDate:d.date},pace,[]);return {date:d.date,conflicts:trial.conflicts.length?trial.conflicts:['capacity'],overflow:trial.overflow};})};});
    const plan={id:pace,days,included,unplacedRestaurants,unplacedMust,unplacedDetails,unused:unique.filter(p=>!planned.has(p.id))};
    plan.quality=evaluatePlan(plan,settings);return plan;
  });
}
