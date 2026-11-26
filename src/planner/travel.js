import {haversineDistance} from '../utils/geo.js';
export const routeKey=(a,b,mode='transit')=>[a?.longitude,a?.latitude,b?.longitude,b?.latitude,mode].join('|');
export function travelBetween(a,b,settings){
 const km=a&&b?haversineDistance(a,b):0,mode=settings.transport||'transit';
 if(!km)return {minutes:0,km:0,walking:0,estimated:true,mode,source:'estimate'};
 const known=settings.routes?.[routeKey(a,b,mode)];
 if(known&&Date.now()-known.fetchedAt<300000&&Number.isFinite(known.seconds)&&Number.isFinite(known.meters))return {minutes:Math.ceil(known.seconds/60),km:known.meters/1000,walking:(known.walkingMeters||0)/1000,estimated:false,source:known.source,mode:known.mode};
 const onFoot=mode==='walking'||(mode==='transit'&&km<=(settings.walking==='low'?.5:settings.walking==='high'?1.8:1));
 // Network distance unknown: retain straight-line km and label all fallback travel as an estimate.
 return {minutes:Math.ceil(onFoot?km*1.35/4*60:mode==='driving'?10+km*1.4/25*60:15+km*1.4/18*60),km,walking:onFoot?km*1.35:mode==='driving'?.1:.5,estimated:true,source:'estimate',mode:onFoot?'walking':mode};
}
