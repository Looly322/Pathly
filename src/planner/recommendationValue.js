// Transparent planning heuristics, never a popularity/rating claim.
export function recommendationValue(place,settings,selected=[]){
 const matches=(place.subcategories||[]).filter(i=>(settings.interests||[]).includes(i));
 const type=place.visit?.type||'unknown';
 const interest=matches.length*45;
 const diversity=selected.some(p=>(p.visit?.type||p.category)===type)?0:18;
 const evidence=(place.heritage?15:0)+(place.visit?.basis==='reviewed-profile'?10:0)+(place.wikidata?3:0);
 const retrieval=Number.isFinite(place.discoveryRank)?Math.max(0,20-place.discoveryRank):0;
 const scope=matches.length?({majorMuseum:14,historicComplex:12,museum:10,district:8,religious:6,cityPark:5}[type]||0):0;
 const minor=['installation','wall_painting','sculptures','fountains'].includes(place.featureType)?25:0;
 return {score:interest+diversity+evidence+retrieval+scope-minor,interest,diversity,evidence,retrieval,scope,minor,basis:'planning-rule',ratingUsed:false};
}
