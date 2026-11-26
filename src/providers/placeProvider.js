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
    return {places:[...all.values()],warnings,limited:false};
  }
};
export const CurrentOverseasProvider={
  async search({destination}) {
    // 仅读取本地已有真实快照；不调用以前的搜索端点，也不读取任何第三方密钥。
    const r=await fetch('/api/current-places?'+new URLSearchParams({latitude:destination.latitude,longitude:destination.longitude,countryCode:destination.countryCode,radius:50000}),{signal:AbortSignal.timeout(15000)});
    if(!r.ok) throw new Error('NO_PLACE_DATA');
    const data=await r.json();
    return {places:data.places.map(p=>normalizePlace(p,destination)).filter(validPlace),warnings:[],limited:true};
  }
};
export function getPlaceProvider(destination){return destination.countryCode==='CN'?AmapPlaceProvider:CurrentOverseasProvider;}
export async function getCandidatePlaces(settings,destination){return getPlaceProvider(destination).search({...settings,destination});}
