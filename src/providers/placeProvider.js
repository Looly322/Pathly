import {apiJson} from '../services/apiClient.js';
import { normalizePlace, validPlace } from '../planner/place.js';
import { searchPlaces } from '../services/placeService.js';
import { resolveMapCity } from '../services/cityService.js';
const queries={CULTURE:['博物馆','风景名胜'],FOOD:['当地特色餐厅','餐饮服务'],NATURE:['公园','风景名胜'],SHOPPING:['购物中心','购物服务'],ART:['美术馆','科教文化服务'],CITY_WALK:['历史街区','风景名胜'],ENTERTAINMENT:['娱乐','体育休闲服务'],NIGHTLIFE:['夜景','风景名胜'],FAMILY:['动物园','风景名胜']};
// PlaceProvider 契约：search({destination,interests,wishlist}) -> {places,warnings}。
// 规划器不导入任何地图 SDK 或提供方。未来提供方实现相同方法即可注册。
export const AmapPlaceProvider={
  async search({destination,interests=[],wishlist=[]}) {
    const city=await resolveMapCity(destination.displayName||destination.city);
    const all=new Map(), warnings=[];
    const requests=[['','风景名胜'],...interests.map(i=>queries[i]).filter(Boolean),...wishlist.slice(0,8).map(name=>[name,''])];
    for(const [keyword,type] of new Map(requests.map(q=>[q.join('|'),q])).values()) {
      try {
        const hits=await searchPlaces(city.name,keyword,{cityCode:city.adcode,type});
        for(const p of hits){
          if(/停车场|售票处|公共厕所|检票|出入口|管理处|卫生间/.test(p.name)) continue;
          all.set(p.id,normalizePlace(p,destination));
        }
      } catch {warnings.push(keyword||type);}
    }
    if(!all.size) throw new Error('NO_PLACE_DATA');
    return {places:[...all.values()].filter(p=>p.planningEligible!==false),warnings,limited:false};
  }
};
export const CurrentOverseasProvider={
  async search({destination,interests=[]}) {
    // 快照只是缓存来源，不能成为未覆盖城市的入口限制。
    let places=[];
    try{
      const r=await fetch('/api/current-places?'+new URLSearchParams({latitude:destination.latitude,longitude:destination.longitude,countryCode:destination.countryCode,radius:50000}),{signal:AbortSignal.timeout(15000)});
      if(r.ok){const data=await r.json();places=data.places.map(p=>normalizePlace(p,destination)).filter(p=>validPlace(p)&&p.planningEligible!==false);}
    }catch{/* 继续尝试开放数据提供方 */}
    // 现有快照充足时复用；未覆盖城市或兴趣缺口由同一个全球开放数据提供方补充。
    if(places.length<12 || interests.some(i=>!places.some(p=>p.subcategories.includes(i)))){
      try{
        const response=await fetch('/api/open-places?'+new URLSearchParams({latitude:destination.latitude,longitude:destination.longitude,city:destination.city}),{signal:AbortSignal.timeout(30000)});
        if(!response.ok)throw new Error('NO_PLACE_DATA');
        const live=await response.json();
        for(const raw of live.places){const p=normalizePlace(raw,destination);if(validPlace(p)&&p.planningEligible!==false&&!places.some(v=>v.name===p.name&&Math.abs(v.latitude-p.latitude)<.001&&Math.abs(v.longitude-p.longitude)<.001))places.push(p);}
      }catch{if(!places.length)return {places:[],warnings:['NO_PLACE_DATA'],limited:true};}
    }
    return {places,warnings:[],limited:true};
  }
};
export const OpenTripMapPlaceProvider={
 async search({destination,interests=[]}){
  const params=new URLSearchParams({latitude:destination.latitude,longitude:destination.longitude,city:destination.city,countryCode:destination.countryCode,interests:interests.join(',')});
  // 餐饮查询与景点并行，不让慢餐饮接口阻塞首屏行程。
  const supplement=interests.includes('FOOD')?fetch('/api/open-places?'+params,{signal:AbortSignal.timeout(12000)})
    .then(async r=>r.ok?(await r.json()).places.map(p=>normalizePlace(p,destination)).filter(p=>['FOOD','CAFE'].includes(p.category)):[]).catch(()=>[]):Promise.resolve([]);
  const data=await apiJson('/api/otm/places?'+params,{timeout:45000});
  if(!Array.isArray(data.places))throw new Error('API_INVALID_RESPONSE');
  const places=data.places.map(p=>normalizePlace(p,destination));
  return {places:places.filter(validPlace),supplement,warnings:[],limited:true};
 }
};
export function getPlaceProvider(destination){return destination.countryCode==='CN'?AmapPlaceProvider:OpenTripMapPlaceProvider;}
export async function getCandidatePlaces(settings,destination){return getPlaceProvider(destination).search({...settings,destination});}
