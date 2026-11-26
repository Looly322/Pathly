import { loadAmap, withTimeout } from './amapService.js';
import { hasValidCoordinates } from '../utils/geo.js';
const number = value => (typeof value==='number'||typeof value==='string'&&value.trim())&&Number.isFinite(Number(value))&&Number(value)>=0 ? Number(value) : null;
const path = points => (points||[]).map(p=>Array.isArray(p)?p:[p.getLng?.()??p.lng,p.getLat?.()??p.lat]).filter(p=>hasValidCoordinates({longitude:p[0],latitude:p[1]}));
export function normalizeTransfer(plan,index=0){
  const seconds=number(plan.time),meters=number(plan.distance);
  if(seconds==null||meters==null)return null;
  const segments=(plan.segments||[]).map(s=>({mode:s.transit_mode==='WALK'?'walk':s.transit_mode==='SUBWAY'?'subway':s.transit_mode==='BUS'?'bus':'other',
    instruction:s.instruction||'',seconds:number(s.time),meters:number(s.distance),line:s.transit?.lines?.[0]?.name||'',
    from:s.transit?.on_station?.name||'',to:s.transit?.off_station?.name||'',entrance:s.transit?.entrance?.name||'',exit:s.transit?.exit?.name||'',
    path:path(s.transit?.path),steps:(s.transit?.steps||[]).map(step=>step.instruction).filter(Boolean)}));
  return {id:`transit-${index}`,mode:'transit',seconds,meters,cost:number(plan.cost),walkingMeters:number(plan.walking_distance),transfers:Math.max(0,segments.filter(s=>s.mode!=='walk').length-1),segments,source:'amap'};
}
export function normalizeWalking(route){
  const seconds=number(route.time),meters=number(route.distance);
  if(seconds==null||meters==null)return null;
  return {id:'walking',mode:'walking',seconds,meters,cost:null,walkingMeters:meters,transfers:0,source:'amap',segments:[{mode:'walk',seconds,meters,instruction:'',path:path(route.steps?.flatMap(s=>s.path||[])),steps:(route.steps||[]).map(s=>s.instruction).filter(Boolean)}]};
}
function search(service,origin,destination){
  return withTimeout(new Promise((resolve,reject)=>service.search([origin.longitude,origin.latitude],[destination.longitude,destination.latitude],(status,result)=>{
    if(status==='no_data')return resolve(null);
    if(status==='complete')resolve(result);else reject(new Error('ROUTE_QUERY_FAILED'));
  })),'ROUTE_QUERY_FAILED');
}
const cache=new Map();
export async function getTransportOptions(origin,destination,city,mode='transit'){
  if(!hasValidCoordinates(origin)||!hasValidCoordinates(destination))throw new Error('INVALID_COORDINATES');
  const key=JSON.stringify([origin.longitude,origin.latitude,destination.longitude,destination.latitude,city,mode]);
  const saved=cache.get(key);if(saved&&Date.now()-saved.at<300000)return saved.value;
  const A=await loadAmap();
  const jobs=[search(new A.Walking({}),origin,destination)];
  if(mode!=='walking')jobs.push(search(new A.Transfer({city,cityd:city,policy:mode==='bus'?A.TransferPolicy.NO_SUBWAY:A.TransferPolicy.LEAST_TIME,extensions:'all'}),origin,destination));
  const results=await Promise.allSettled(jobs);
  const walk=results[0].status==='fulfilled'&&results[0].value?.routes?.[0]?normalizeWalking(results[0].value.routes[0]):null;
  const transit=results[1]?.status==='fulfilled'?(results[1].value?.plans||[]).slice(0,3).map(normalizeTransfer).filter(Boolean):[];
  // 公交不可用时保留独立查询到的步行方案，并明确标注公交查询失败/无结果。
  const options=[...transit,...(walk?[walk]:[])];
  const value={options,transitStatus:mode==='walking'?'notRequested':results[1].status==='rejected'?'error':transit.length?'ok':'empty',walkingStatus:results[0].status==='rejected'?'error':walk?'ok':'empty'};
  if(results.every(r=>r.status==='fulfilled')){if(cache.size>60)cache.delete(cache.keys().next().value);cache.set(key,{at:Date.now(),value});}
  return value;
}
