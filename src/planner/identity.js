import {haversineDistance} from '../utils/geo.js';
const clean=s=>String(s||'').toLowerCase().replace(/[\s·•（）()\-—]/g,'');
export const namesOf=p=>[p.name,p.nameZh,p.nameEnglish,...(Array.isArray(p.aliases)?p.aliases:[])].filter(Boolean).map(clean);
export function samePlace(a,b){
 if(a.id===b.id||(a.wikidata&&a.wikidata===b.wikidata))return true;
 if(haversineDistance(a,b)>.3)return false;
 return namesOf(a).some(x=>namesOf(b).some(y=>x===y||(Math.min(x.length,y.length)>=3&&(x.includes(y)||y.includes(x)))));
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
