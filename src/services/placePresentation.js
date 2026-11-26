import {weatherCoordinates} from './weatherService.js';
// 有界队列、请求去重与正/负缓存：失败和无结果也必须结束加载。
const cache=new Map(),pending=new Map(),queue=[];
const running={text:0,photo:0};
const storageKey='pathly-presentation-v8';
try{for(const [key,value] of JSON.parse(localStorage.getItem(storageKey)||'[]'))if(value.expires>Date.now())cache.set(key,value);}catch{}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify([...cache].slice(-200)));}catch{}}
function run(){for(const lane of ['text','photo'])while(running[lane]<2){
 const at=queue.findIndex(j=>j.lane===lane&&!j.expired);if(at<0)break;
 const job=queue.splice(at,1)[0];clearTimeout(job.waitTimer);running[lane]++;
 const signal=AbortSignal.timeout(job.timeout);
 let abort;const cancelled=new Promise((_,reject)=>{abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});});
 Promise.race([job.work(signal),cancelled]).then(job.resolve,job.reject).finally(()=>{signal.removeEventListener('abort',abort);running[lane]--;run();});
}}
function schedule(work,timeout,lane,priority=0){return new Promise((resolve,reject)=>{
 const job={work,timeout,lane,priority,resolve,reject,expired:false};job.waitTimer=setTimeout(()=>{job.expired=true;const i=queue.indexOf(job);if(i>=0)queue.splice(i,1);reject(new Error('PRESENTATION_QUEUE_TIMEOUT'));},60000);queue.push(job);queue.sort((a,b)=>b.priority-a.priority);run();
});}
export function safeWebsite(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
export async function loadPlacePresentation(place,city,signal,force=false,options={}){
 const part=options.part||'all',key=[place.source,place.sourceId||place.id,place.latitude,place.longitude,part].join('|');
 if(!force&&cache.get(key)?.expires>Date.now())return cache.get(key).data;
 if(!pending.has(key)){
  const task=schedule(async requestSignal=>{
   const point=weatherCoordinates({...place,coordinateSystem:place.source==='amap'?'GCJ02':place.coordinateSystem});
   const params=new URLSearchParams({name:place.name,...point,city:city||'',category:place.categories?.[0]?.name||'',commonsFile:place.commonsFile||'',wikidata:place.wikidata||place.nameZhSourceId||'',refresh:force?'1':'0',image:part==='text'?'0':'1'});
   const endpoint=place.source==='opentripmap'&&!/^Q\d+$/.test(place.wikidata||place.nameZhSourceId||'')?'/api/otm/details?'+new URLSearchParams({xid:place.sourceId,name:place.name,part,refresh:force?'1':'0'}):'/api/places/localize?'+params;
   let data={};
   try{const response=await fetch(endpoint,{signal:AbortSignal.any([requestSignal,AbortSignal.timeout(14000)])});if(!response.ok)throw new Error('PRESENTATION_'+response.status);data=await response.json();}
   catch(error){if(part==='text'){
    // OTM availability must not prevent identity-and-coordinate verified labels.
    const fallback=await fetch('/api/places/localize?'+params,{signal:requestSignal});if(!fallback.ok)throw error;data=await fallback.json();
   }else data={photoStatus:'error',photoError:error.message};}
   if(part==='text'&&!data.nameZh&&endpoint.startsWith('/api/otm/')){
    try{const fallback=await fetch('/api/places/localize?'+params,{signal:requestSignal});if(fallback.ok)data={...data,...await fallback.json()};}catch{}
   }

   if((part==='photo'||part==='all')&&!data.photo){
    try{const extra=await fetch('/api/commons-image?'+new URLSearchParams({name:place.nameEnglish||place.name,...point,city:city||'',country:place.country||'',wikidata:place.wikidata||place.nameZhSourceId||'',refresh:force?'1':'0'}),{signal:requestSignal});if(extra.ok){const media=await extra.json();if(media.photo)data={...data,...media};}}catch{}
   }
   if(requestSignal.aborted)throw requestSignal.reason;
   const result={...data};
   if(part==='photo'||part==='all')result.photoStatus=data.photo?'ready':data.photoStatus||'missing';
   cache.set(key,{data:result,expires:Date.now()+(data.photoStatus==='error'?60000:data.photo||data.nameZh?86400000:600000)});persist();return result;
  },options.timeout||25000,part==='text'?'text':'photo',options.priority||0).catch(error=>{
   // 短负缓存避免翻页或重渲染触发重试风暴；手动重试可绕过。
   cache.set(key,{data:{...(part==='photo'||part==='all'?{photoStatus:'error'}:{}),status:'error'},expires:Date.now()+60000});
   throw error;
  });pending.set(key,task);task.finally(()=>pending.delete(key)).catch(()=>{});
 }
 if(!signal)return pending.get(key);
 return Promise.race([pending.get(key),new Promise((_,reject)=>{if(signal.aborted)reject(signal.reason);else signal.addEventListener('abort',()=>reject(signal.reason),{once:true});})]);
}
