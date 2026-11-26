import {haversineDistance} from '../utils/geo.js';
const clean=s=>String(s||'').toLowerCase().replace(/[\s·•（）()\-—]/g,'');
export const namesOf=p=>[p.name,p.nameZh,p.nameEnglish,...(Array.isArray(p.aliases)?p.aliases:[])].filter(Boolean).map(clean);
export function samePlace(a,b){
 if(a.id===b.id||(a.wikidata&&a.wikidata===b.wikidata))return true;
 // Reviewed whole-site aliases can have different entrance/resort POI IDs.
 if(a.visit?.profileId&&a.visit.profileId===b.visit?.profileId&&haversineDistance(a,b)<2)return true;
 if(haversineDistance(a,b)>.3)return false;
 if(namesOf(a).some(x=>namesOf(b).includes(x)))return true;
 // Only recognize a city-qualified site alias, not every name containing another
 // (e.g. a temple's museum or a similarly named neighbouring attraction).
 const qualified=(long,short)=>{const base=clean(short.name),head=clean(String(long.name).split(/[-—]/)[0]);if(base.length<3||!head.endsWith(base))return false;const prefix=head.slice(0,-base.length);const cities=[a.city,b.city].filter(Boolean).flatMap(c=>[clean(c),clean(c).replace(/市$/,'')]);return !!prefix&&cities.some(c=>prefix===c||prefix===c+'市');};
 return qualified(a,b)||qualified(b,a);
}
export function dedupePlaces(places,preferred=[]){
 const result=[];
 for(const p of [...places].sort((a,b)=>Number(preferred.includes(b.id))-Number(preferred.includes(a.id)))){
  const found=result.find(q=>samePlace(p,q));if(!found)result.push({...p,duplicateIds:[p.id,...(p.duplicateIds||[])]});
  else{found.duplicateIds.push(p.id,...(p.duplicateIds||[]));found.aliases=[...(found.aliases||[]),p.name];}
 }
 return result;
}
export function matchWish(places,name){const n=clean(name);const exact=places.filter(p=>namesOf(p).includes(n));if(exact.length)return exact;return places.filter(p=>namesOf(p).some(s=>n.length>=3&&s.includes(n)));}
