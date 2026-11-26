import { getRoute } from '../services/routeService.js';
// 依据当前候选点的分布计算，避免简单把整座城市贴成“紧凑”或“分散”。
const median = values => {const xs=[...values].sort((a,b)=>a-b);return xs.length?xs[Math.floor(xs.length/2)]:0;};
export const isAttraction = place => !['coffee','food','reading'].includes(place.category);
export function analyzeRegion(places) {
  const actual=places.filter(p=>!p.demo&&!/演示/.test(p.name));
  const candidates=actual.length>=2?actual:places;
  const nearest=candidates.map((p,i)=>Math.min(...candidates.filter((_,j)=>i!==j).map(q=>getRoute(p,q).distance))).filter(Number.isFinite);
  const nearestKm=median(nearest);
  const typicalStay=median(candidates.filter(isAttraction).map(p=>p.estimatedStay))||60;
  return {nearestKm:+nearestKm.toFixed(1),typicalStay,kind:nearestKm>=3?'spread':typicalStay>=100?'longVisits':'compact',source:actual.every(p=>p.coordinateSource==='amap')&&actual.length>=2?'amapCoordinates':'mock'};
}
