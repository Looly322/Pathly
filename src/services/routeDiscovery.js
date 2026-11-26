import {searchPlaces} from './placeService.js';
import {normalizePlace} from '../planner/place.js';
import {haversineDistance} from '../utils/geo.js';
const cache=new Map();
// One bounded local discovery pass per day; no full-city repeated search.
export async function discoverAlongRoute(day,destination,isCurrent=()=>true){
 if(destination.countryCode!=='CN'||day.items.some(i=>i.place.visit?.fullDay))return [];
 const anchors=[day.items[0]?.place,day.items.at(-1)?.place].filter((p,i,a)=>p&&!a.slice(0,i).some(q=>q&&haversineDistance(p,q)<.3));
 const sparse=day.items.reduce((n,i)=>n+i.duration,0)<180;
 const types=['中餐厅',...(sparse?['博物馆']:[])];const found=[];
 for(const anchor of anchors)for(const type of types){
  if(!isCurrent())return [];
  const key=[destination.id,anchor.id,type].join('|'),saved=cache.get(key);
  if(saved&&Date.now()-saved.at<300000){found.push(...saved.places);continue;}
  try{
   await new Promise(r=>setTimeout(r,400));
   const raw=await searchPlaces(destination.displayName||destination.city,'',{type,center:anchor,radius:type==='中餐厅'?1200:3500,pageSize:10,timeout:6000});
   const places=raw.map(p=>normalizePlace(p,destination)).filter(p=>p.planningEligible!==false);
   cache.set(key,{at:Date.now(),places});found.push(...places);
   if(cache.size>80)cache.delete(cache.keys().next().value);
  }catch{/* Keep meal reservations and explain sparse days; do not fabricate venues. */}
 }
 return isCurrent()?[...new Map(found.map(p=>[p.id,p])).values()]:[];
}
