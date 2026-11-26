import {haversineDistance} from '../utils/geo.js';
import {samePlace} from './identity.js';
import {containedBy} from './visitDuration.js';
// This is only a bounded query shortlist, never a road-distance claim.
export function nearbyRouteCandidates(day,candidates,settings,limit=2){
 const anchors=day.items.map(i=>i.place);
 if(!anchors.length||anchors.some(p=>p.visit?.fullDay))return [];
 return candidates.filter(p=>p.planningEligible!==false&&!p.isOutskirts&&!['FOOD','CAFE'].includes(p.category)&&!p.visit?.fullDay&&!anchors.some(a=>samePlace(a,p)||containedBy(a,p)||containedBy(p,a)))
  .map(p=>({p,km:Math.min(...anchors.map(a=>haversineDistance(a,p))),matches:p.subcategories?.filter(i=>settings.interests.includes(i)).length||0}))
  .filter(x=>x.km<=6)
  .sort((a,b)=>(b.matches?1:0)-(a.matches?1:0)||a.km-b.km||(a.p.discoveryRank??20)-(b.p.discoveryRank??20))
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
