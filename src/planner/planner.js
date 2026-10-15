import { haversineDistance } from '../utils/geo.js';
import {orderDailyRoute} from './routeOrdering.js';
import { validPlace } from './place.js';
export const PACES={relaxed:{max:3,stay:1.15,buffer:20,rest:30,fatigue:58},balanced:{max:4,stay:1,buffer:15,rest:25,fatigue:70},efficient:{max:5,stay:.9,buffer:10,rest:20,fatigue:80}};
export const SCORE_WEIGHTS={interest:45,diversity:24,wish:500,distance:7,fatigue:1.2,value:10};
export const minutes=time=>time.split(':').reduce((h,m)=>Number(h)*60+Number(m));
export const clock=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
const distance=(a,b)=>a&&b?haversineDistance(a,b):0;
export function preferenceScore(place,settings,selected=[]){
  const matches=place.subcategories.filter(i=>settings.interests.includes(i));
  const categories=new Set(selected.map(p=>p.category));
  const last=selected.at(-1);
  return matches.length*SCORE_WEIGHTS.interest+(categories.has(place.category)?0:SCORE_WEIGHTS.diversity)+(settings.mustIds?.includes(place.id)?SCORE_WEIGHTS.wish:0)+SCORE_WEIGHTS.value+(place.heritage?15:0)+(place.quality||0)*3+(place.wikidata?3:0)-distance(last,place)*SCORE_WEIGHTS.distance;
}
function travelBetween(a,b,settings){
  const km=distance(a,b);
  if(!km) return {minutes:0,km:0,walking:0,estimated:true};
  // 仅为排程预留，不当成真实导航；远距离留更多时间而非压缩成固定 40 分钟。
  const walkLimit=settings.walking==='low'?.5:settings.walking==='high'?1.8:1;
  const onFoot=km<=walkLimit;
  return {minutes:Math.ceil(onFoot?km/4*60:12+km/18*60),km,walking:onFoot?km:.35,estimated:true};
}
export function fatigueCost(events){
  let continuous=0,longest=0,walking=0,travel=0,large=0,activities=0,backtracking=0;
  const places=[];
  for(const e of events){
    travel+=e.travel?.minutes||0;walking+=e.travel?.walking||0;
    if(e.kind==='MEAL'||e.kind==='REST'){continuous=0;continue;}
    activities++;large+=e.place.large?1:0;continuous+=e.duration+(e.travel?.minutes||0);longest=Math.max(longest,continuous);
    walking+=e.place.category==='NATURE'?1.5:e.place.large?1:e.place.category==='SHOPPING'?1:.5;
    places.push(e.place);
  }
  for(let i=2;i<places.length;i++) if(distance(places[i-2],places[i])<1.5&&distance(places[i-1],places[i])>4) backtracking++;
  const hasRest=events.some(e=>e.kind==='REST');
  const score=Math.min(100,Math.round(activities*5+walking*3+travel*.1+large*4+Math.max(0,longest-180)*.2+backtracking*12+(!hasRest&&activities>2?12:0)));
  return {score,walking:+walking.toFixed(1),travel,large,longest,backtracking,activities};
}
export function mealWindows(settings){
  const start=minutes(settings.start),end=minutes(settings.end);
  return [{slot:'LUNCH',start:690,end:810,preferred:720},{slot:'DINNER',start:1050,end:1230,preferred:1080}]
    .map(w=>({...w,start:Math.max(w.start,start),end:Math.min(w.end,end)})).filter(w=>w.end-w.start>=30);
}
export function scheduleDay(items,settings,pace,foodPlaces=[]){
  const style=PACES[pace],events=[],end=minutes(settings.end),windows=mealWindows(settings),usedFood=new Set();
  let cursor=minutes(settings.start),last=settings.origin||null,continuous=0,restDone=false;
  const push=(event,start,duration)=>{events.push({...event,start,end:start+duration,duration});cursor=start+duration;};
  const rest=()=>{push({id:'rest-'+events.length,kind:'REST',activityType:'REST',reason:'rest',travel:{minutes:0}},cursor,style.rest);continuous=0;restDone=true;};
  function meal(w){
    const duration=Math.min(60,w.end-w.start);
    let candidate=null,route={minutes:0,km:0,walking:0,estimated:true};
    if(settings.interests.includes('FOOD')&&last){
      candidate=foodPlaces.filter(p=>!usedFood.has(p.id)&&distance(last,p)<1.2).sort((a,b)=>distance(last,a)-distance(last,b))[0];
      if(candidate){route=travelBetween(last,candidate,settings);if(Math.max(cursor+route.minutes,w.start)+duration>w.end) candidate=null;}
    }
    if(!candidate) route={minutes:0,km:0,walking:0,estimated:true};
    const start=Math.max(cursor+route.minutes,w.start,Math.min(w.preferred,w.end-duration));
    push({id:w.slot,kind:'MEAL',activityType:'FOOD',slot:w.slot,place:candidate||null,foodCandidate:{category:'FOOD',near:last?{latitude:last.latitude,longitude:last.longitude}:null,matchedId:candidate?.id||null},reason:settings.interests.includes('FOOD')?'foodMeal':'meal',travel:route,window:w},start,duration);
    if(candidate){usedFood.add(candidate.id);last=candidate;}continuous=0;
  }
  for(const item of items){
    const place=item.place||item;
    let duration=item.duration||Math.max(place.minimumDuration,Math.round(place.estimatedDuration*style.stay/5)*5);
    if(settings.party==='family'||settings.party==='seniors') duration=Math.max(duration,place.estimatedDuration);
    let route=travelBetween(last,place,settings);
    if(windows.length&&Math.max(cursor,place.category==='NIGHTLIFE'?1080:cursor)+route.minutes+(last?style.buffer:0)+duration>windows[0].end-Math.min(60,windows[0].end-windows[0].start)) {meal(windows.shift());route=travelBetween(last,place,settings);}
    if(continuous+duration+route.minutes>180&&continuous>0){rest();route=travelBetween(last,place,settings);}
    if(place.category==='NIGHTLIFE')cursor=Math.max(cursor,1080);
    const start=cursor+route.minutes+(last?style.buffer:0);
    const matches=place.subcategories.filter(i=>settings.interests.includes(i));
    push({id:place.id,kind:'ACTIVITY',activityType:place.category,place,travel:route,matches,reason:settings.mustIds?.includes(place.id)?'must':matches.length?'interest':'nearby'},start,duration);
    continuous+=route.minutes+duration;last=place;
  }
  if(items.length&&!restDone)rest();
  for(const w of windows)meal(w);
  const fatigue=fatigueCost(events);
  const knownCost=events.reduce((sum,e)=>sum+(e.place?.price||0),0);
  const reserve=events.reduce((sum,e)=>sum+(e.kind==='MEAL'?60:e.kind==='ACTIVITY'&&e.place.price==null?40:0)+(e.travel?.minutes?10:0),0);
  const conflicts=[];
  if(cursor>end)conflicts.push('time');
  if(events.some(e=>e.window&&(e.start<e.window.start||e.end>e.window.end)))conflicts.push('mealWindow');
  const walkingLimit={low:4,medium:7,high:11}[settings.walking]||7;
  if(fatigue.walking>walkingLimit)conflicts.push('walking');
  if(fatigue.score>style.fatigue||fatigue.longest>210)conflicts.push('fatigue');
  if(knownCost+reserve>settings.budget)conflicts.push('budget');
  if(items.length>style.max)conflicts.push('count');
  const available=end-minutes(settings.start);
  const occupied=events.reduce((sum,e)=>sum+e.duration+(e.travel?.minutes||0),0);
  const free=Math.max(0,available-occupied);
  const stability=Math.max(0,Math.min(100,Math.round(100-fatigue.score*.45-conflicts.length*15+Math.min(10,free/20))));
  return {events,fatigue,knownCost,reserve,conflicts,overflow:Math.max(0,cursor-end),free,stability,usedFood:[...usedFood],items:items.map(i=>i.place?i:{place:i})};
}
export function generateItineraries(candidatePlaces,settings){
  const unique=[...new Map(candidatePlaces.filter(p=>validPlace(p)&&p.planningEligible!==false).map(p=>[p.id,p])).values()];
  return Object.keys(PACES).map(pace=>{
    const used=new Set(),days=[],food=unique.filter(p=>p.category==='FOOD');
    const core=unique.filter(p=>(!p.isOutskirts||settings.mustIds?.includes(p.id))&&p.category!=='FOOD'&&(p.category!=='CAFE'||settings.interests.includes('FOOD')));
    for(let day=0;day<settings.days;day++){
      const available=core.filter(p=>!used.has(p.id));
      // 将有限候选分配到各天，避免第一天耗尽候选、后续重复景点。
      const max=Math.min(PACES[pace].max,Math.ceil(available.length/(settings.days-day)));
      let selected=[],schedule=scheduleDay([],settings,pace,food);
      while(selected.length<max){
        const ranked=available.filter(p=>!selected.some(s=>s.id===p.id)&&(p.category!=='CAFE'||!selected.some(s=>s.category==='CAFE'))).map(p=>({p,score:preferenceScore(p,settings,selected)})).sort((a,b)=>b.score-a.score);
        let best=null;
        for(const entry of ranked){
          // 以当日首站为空间锚点聚类；下一天从未选候选中重新取种子。
          if(selected.length&&distance(selected[0],entry.p)>(pace==='relaxed'?4:7)&&!settings.mustIds?.includes(entry.p.id))continue;
          const trial=scheduleDay([...selected,entry.p],settings,pace,food.filter(p=>!used.has(p.id)));
          if(trial.conflicts.length)continue;
          const value=entry.score-trial.fatigue.score*SCORE_WEIGHTS.fatigue;
          if(!best||value>best.value)best={place:entry.p,schedule:trial,value};
        }
        if(!best)break;
        selected.push(best.place);schedule=best.schedule;
      }
      const ordered=orderDailyRoute(selected);
      const optimized=scheduleDay(ordered,settings,pace,food.filter(p=>!used.has(p.id)));
      if(!optimized.conflicts.length){selected=ordered;schedule=optimized;}
      selected.forEach(p=>used.add(p.id));schedule.usedFood.forEach(id=>used.add(id));
      const date=new Date(settings.date+'T12:00:00');date.setDate(date.getDate()+day);
      days.push({...schedule,day:day+1,date:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,underfilled:selected.length<2,availableCount:available.length});
    }
    const planned=new Set(days.flatMap(d=>d.events.filter(e=>e.place).map(e=>e.place.id)));
    return {id:pace,days,unplacedMust:(settings.mustIds||[]).filter(id=>!planned.has(id)),unused:unique.filter(p=>!planned.has(p.id))};
  });
}
