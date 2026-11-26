import {haversineDistance} from '../utils/geo.js';
import {samePlace} from './identity.js';
import {containedBy,visitDuration} from './visitDuration.js';
// This is only a bounded query shortlist, never a road-distance claim.
export function nearbyRouteCandidates(day,candidates,settings,limit=2){
 const anchors=day.items.map(i=>i.place);
 if(!anchors.length||anchors.some(p=>p.visit?.fullDay))return [];
 const spare=Math.max(60,...(day.gaps||[]).map(g=>g.end-g.start)),types=new Set(anchors.map(p=>p.visit?.type));
 return candidates.filter(p=>p.planningEligible!==false&&!p.isOutskirts&&!['FOOD','CAFE'].includes(p.category)&&!p.visit?.fullDay&&!anchors.some(a=>samePlace(a,p)||containedBy(a,p)||containedBy(p,a)))
  .map(p=>({p,km:Math.min(...anchors.map(a=>haversineDistance(a,p))),matches:p.subcategories?.filter(i=>settings.interests.includes(i)).length||0}))
  .filter(x=>x.km<=6)
  .map(x=>({...x,score:(x.matches?20:0)+(types.has(x.p.visit?.type)?0:8)-x.km*2-Math.max(0,visitDuration(x.p,settings,settings.pace||'balanced')-spare)*.4}))
  .sort((a,b)=>b.score-a.score||(a.p.discoveryRank??20)-(b.p.discoveryRank??20))
  .slice(0,limit).map(x=>x.p);
}
export function candidateRoutePairs(day,candidates,settings){
 const anchors=day.items.map(i=>i.place),pairs=[];
 for(const p of candidates){
  const nearest=[...anchors].sort((a,b)=>haversineDistance(a,p)-haversineDistance(b,p))[0];
  if(nearest)pairs.push([nearest,p],[p,nearest]);
  if(settings.hotel)pairs.push([settings.hotel,p],[p,settings.hotel]);
 }
 return pairs;
}
