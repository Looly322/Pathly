import {imageCandidates} from './imageProvider.js';
import {loadPlacePresentation} from '../services/placePresentation.js';
import {preferenceScore} from '../planner/planner.js';
// 图片必须在用户当前浏览器解码成功，只有 URL 不算验证通过。
export function verifyImage(url,timeout=5000){return new Promise(resolve=>{
 const image=new Image();let timer=setTimeout(()=>finish(false),timeout);
 function finish(ok){clearTimeout(timer);image.onload=image.onerror=null;resolve(ok);}
 image.onload=()=>finish(image.naturalWidth>0);image.onerror=()=>finish(false);image.src=url;
});}
export async function photoEligiblePlaces(places,settings,destination,{lookup=loadPlacePresentation,verify=verifyImage,budget=45000}={}){
 const ordered=[...places].sort((a,b)=>(imageCandidates(b).length>0)-(imageCandidates(a).length>0)||preferenceScore(b,settings)-preferenceScore(a,settings));
 const accepted=[],started=Date.now();let index=0;
 async function worker(){while(index<ordered.length&&Date.now()-started<budget){
  const place=ordered[index++];let enriched=place;
  if(!imageCandidates(enriched).length&&destination.countryCode!=='CN'){
   try{enriched={...place,...await lookup(place,destination.city,null,false,{timeout:8000,attempts:1})};}catch{continue;}
  }
  for(const url of imageCandidates(enriched)){
   if(Date.now()-started>=budget)break;
   if(await verify(url)){accepted.push({...enriched,image:url,verifiedImage:url,photoVerified:true});break;}
  }
  if(accepted.length>=Math.max(12,Math.min(40,settings.days*6)))break;
 }}
 await Promise.all([worker(),worker()]);
 return {places:accepted,excluded:places.length-accepted.length};
}
