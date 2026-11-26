import {haversineDistance} from '../utils/geo.js';
const clean=s=>String(s||'').toLowerCase().replace(/[\s·•（）()\-—]/g,'');
export const namesOf=p=>[p.name,p.nameZh,p.nameEnglish,...(Array.isArray(p.aliases)?p.aliases:[])].filter(Boolean).flatMap(n=>[n,...String(n).split(/[()（）]/).filter(Boolean)]).map(clean);
export function samePlace(a,b){
 if((a.id&&a.id===b.id)||(a.wikidata&&a.wikidata===b.wikidata))return true;
 if(![a.latitude,a.longitude,b.latitude,b.longitude].every(Number.isFinite))return false;
 // Reviewed whole-site aliases can have different entrance/resort POI IDs.
 if(a.visit?.profileId&&a.visit.profileId===b.visit?.profileId&&haversineDistance(a,b)<2)return true;
 // Explicit directional suffixes of the same named park/site are one visit, not
 // nearby unrelated sites. Keep all original IDs as aliases; never infer by proximity alone.
 const sector=n=>clean(n).replace(/(?:[-—·]?[东西南北](?:园区|片区|区域|区|园)|(?:东|西|南|北|正)门(?:入口)?)$/,'');
 const site=/公园|景区|风景区|博物馆|植物园|动物园|遗址|museum|park/i;
 if(!['FOOD','CAFE','SHOPPING'].includes(a.category)&&!['FOOD','CAFE','SHOPPING'].includes(b.category)&&haversineDistance(a,b)<2&&namesOf(a).some(x=>namesOf(b).some(y=>x!==y&&sector(x)===sector(y)&&site.test(sector(x)))))return true;
 if(haversineDistance(a,b)>.3)return false;
 if(namesOf(a).some(x=>namesOf(b).includes(x)))return true;
 // Only recognize a city-qualified site alias, not every name containing another
 // (e.g. a temple's museum or a similarly named neighbouring attraction).
 const qualified=(long,short)=>{const base=clean(short.name),head=clean(String(long.name).split(/[-—]/)[0]);if(base.length<3||!head.endsWith(base))return false;const prefix=head.slice(0,-base.length);const cities=[a.city,b.city].filter(Boolean).flatMap(c=>[clean(c),clean(c).replace(/市$/,'')]);return !!prefix&&cities.some(c=>prefix===c||prefix===c+'市');};
 return qualified(a,b)||qualified(b,a);
}
export function dedupePlaces(places,preferred=[]){
 const result=[];
 for(const p of [...places].sort((a,b)=>Number(preferred.includes(b.id))-Number(preferred.includes(a.id))||Number(/[东西南北](?:园区|片区|区域|区|园)$/.test(a.name))-Number(/[东西南北](?:园区|片区|区域|区|园)$/.test(b.name)))){
  const found=result.find(q=>samePlace(p,q));if(!found)result.push({...p,duplicateIds:[p.id,...(p.duplicateIds||[])]});
  else{found.duplicateIds.push(p.id,...(p.duplicateIds||[]));found.aliases=[...(found.aliases||[]),p.name];}
 }
 return result;
}
export function matchWish(places,name){const n=clean(name);const exact=places.filter(p=>namesOf(p).includes(n));if(exact.length)return exact;return places.filter(p=>namesOf(p).some(s=>n.length>=3&&s.includes(n)));}
