import {getTransportOptions} from './transportService.js';
import {routeKey} from '../planner/travel.js';
import {candidateRoutePairs} from '../planner/routeCandidates.js';
// Bounded shared transport lookup for selected legs and nearby alternatives.
// No complete N² matrix, no paid provider, no invented public transit.
export async function collectRoutePairs(pairs,destination,settings,isCurrent=()=>true,{query=getTransportOptions,budget=20000,maxRequests=8}={}){
 if(destination.countryCode!=='CN'||settings.transport==='driving')return {};
 const mode=settings.transport||'transit',routes={},seen=new Set(),queue=[];
 for(const [from,to] of pairs){
  if(!from||!to||from.longitude===to.longitude&&from.latitude===to.latitude)continue;
  const key=routeKey(from,to,mode),saved=settings.routes?.[key];
  if(seen.has(key)||saved&&Date.now()-saved.fetchedAt<300000)continue;
  seen.add(key);queue.push({from,to,key});
 }
 const deadline=Date.now()+budget;let cursor=0;
 async function worker(){
  while(cursor<Math.min(queue.length,maxRequests)&&isCurrent()&&Date.now()<deadline){
   const {from,to,key}=queue[cursor++];let timer;
   try{
    const data=await Promise.race([query(from,to,destination.displayName,mode,false,settings.walking),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('ROUTE_TIMEOUT')),Math.min(8000,Math.max(1,deadline-Date.now())));})]).finally(()=>clearTimeout(timer));
    if(!isCurrent()||Date.now()>=deadline)return;
    const matching=data.options.filter(o=>o.mode===mode);
    matching.sort((a,b)=>(a.seconds+(a.walkingMeters||0)*(settings.walking==='low'?1:.15))-(b.seconds+(b.walkingMeters||0)*(settings.walking==='low'?1:.15)));
    // A failed bus query must not silently become a multi-hour walking trip.
    const option=matching[0]||data.options.find(o=>o.mode==='walking'&&o.meters<=({low:500,medium:1000,high:1800}[settings.walking]||1000));
    if(option)routes[key]={...option,fetchedAt:Date.now()};
   }catch{/* Existing explicitly labelled estimate remains available. */}
  }
 }
 await Promise.all([worker(),worker()]);return routes;
}
export async function collectPlanningRoutes(day,destination,settings,isCurrent=()=>true){
 const places=[...(settings.hotel?[]:[settings.origin]),...day.events.filter(e=>e.place).map(e=>e.place)].filter(Boolean);
 return collectRoutePairs(places.slice(1).map((to,i)=>[places[i],to]),destination,settings,isCurrent,{budget:25000,maxRequests:12});
}
export async function collectAlternativeRoutes(day,candidates,destination,settings,isCurrent=()=>true){
 return collectRoutePairs(candidateRoutePairs(day,candidates,settings),destination,settings,isCurrent,{budget:16000,maxRequests:8});
}
