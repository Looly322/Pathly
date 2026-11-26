// Role filtering is shared by initial selection and gap filling. Explicit wishes survive.
export function sightseeingEligible(place,settings={}) {
 if(settings.mustIds?.some(id=>id===place.id||place.duplicateIds?.includes(id)))return true;
 if(place.planningEligible===false)return false;
 // Low-ranked, poorly documented small sites are not automatic fillers. This is
 // a conservative recommendation rule, not a claim about popularity or quality.
 if(place.discoveryRank>20&&['unknown','religious','landmark'].includes(place.visit?.type)&&!place.website&&!place.heritage&&!place.tourismEvidence&&!place.visit?.profileId)return false;
 if(['FOOD','CAFE','HOTEL'].includes(place.category))return false;
 if(place.category==='SHOPPING')return settings.interests?.includes('SHOPPING')===true;
 if(place.category==='ENTERTAINMENT')return settings.interests?.some(i=>['ENTERTAINMENT','FAMILY'].includes(i))===true;
 if(/宠物园|宠物乐园|萌宠|pet cafe|petting/i.test(place.name||'')&&!place.tourismEvidence)return false;
 const types=[place.type,...(place.categories||[]).map(c=>c.name)].join(' ');
 if(/餐饮服务|住宿服务|商务住宅|生活服务|金融保险|汽车服务|hotel|restaurant|office/i.test(types))return false;
 if(/购物服务|shopping|mall/i.test(types)&&!settings.interests?.includes('SHOPPING'))return false;
 return true;
}
