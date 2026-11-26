import { resolveMapCity } from '../services/cityService.js';
const cache=new Map(),pending=new Map();
export async function resolveDestinations(query){
 const key=query.trim();if(cache.has(key))return cache.get(key);
 if(!pending.has(key)){
  // 同时解析，海外用户不再先等待高德超时。国内仍优先使用高德坐标。
  const domestic=resolveMapCity(key).then(city=>{
   if(!/^[1-6]\d{5}$/.test(city.adcode)||city.name.replace(/市$/,'')!==key.replace(/市$/,''))throw Error('NOT_DOMESTIC');
   return [{...city,id:city.adcode,displayName:city.name,canonicalName:city.name,city:city.name,country:'China',countryCode:'CN',coordinateSystem:'GCJ02'}];
  });
  const global=fetch('/api/destinations/search?'+new URLSearchParams({q:key}),{signal:AbortSignal.timeout(25000)}).then(async r=>{
   if(!r.ok)throw Error('DESTINATION_UNAVAILABLE');const data=await r.json();if(!data.destinations.length)throw Error('DESTINATION_UNAVAILABLE');
   if(data.destinations[0].countryCode==='CN'){try{return await domestic;}catch{}}
   return data.destinations;
  });
  const task=Promise.any([domestic,global]).then(found=>{cache.set(key,found);return found});pending.set(key,task);task.finally(()=>pending.delete(key)).catch(()=>{});
 }
 return pending.get(key);
}
