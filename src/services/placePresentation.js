// 有界队列、请求去重与正/负缓存：失败和无结果也必须结束加载。
const cache=new Map(),pending=new Map(),queue=[];
let running=0;
const storageKey='pathly-presentation-v3';
try{for(const [key,value] of JSON.parse(localStorage.getItem(storageKey)||'[]'))if(value.expires>Date.now())cache.set(key,value);}catch{}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify([...cache].slice(-200)));}catch{}}
function run(){while(running<4&&queue.length){const job=queue.shift();if(job.signal.aborted){job.reject(job.signal.reason);continue;}running++;job.work(job.signal).then(job.resolve,job.reject).finally(()=>{running--;run();});}}
function schedule(work,timeout){
 const signal=AbortSignal.timeout(timeout);
 const task=new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});queue.push({work,resolve,reject,signal});run();});
 return task;
}
export function safeWebsite(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
export async function loadPlacePresentation(place,city,signal,force=false,options={}){
 const part=options.part||'all',key=[place.source,place.sourceId||place.id,place.latitude,place.longitude,part].join('|');
 if(!force&&cache.get(key)?.expires>Date.now())return cache.get(key).data;
 if(!pending.has(key)){
  const task=schedule(async requestSignal=>{
   const params=new URLSearchParams({name:place.name,latitude:place.latitude,longitude:place.longitude,city:city||'',category:place.categories?.[0]?.name||'',commonsFile:place.commonsFile||'',image:part==='text'?'0':'1'});
   const endpoint=place.source==='opentripmap'?'/api/otm/details?'+new URLSearchParams({xid:place.sourceId,part}):'/api/places/localize?'+params;
   const response=await fetch(endpoint,{signal:requestSignal});
   if(!response.ok)throw new Error('PRESENTATION_'+response.status);
   const data=await response.json();
   if(requestSignal.aborted)throw requestSignal.reason;
   const result={...data};
   if(part==='photo'||part==='all')result.photoStatus=data.photo?'ready':data.photoStatus||'missing';
   cache.set(key,{data:result,expires:Date.now()+(data.photoStatus==='error'?60000:data.photo||data.nameZh?86400000:600000)});persist();return result;
  },options.timeout||15000).catch(error=>{
   // 短负缓存避免翻页或重渲染触发重试风暴；手动重试可绕过。
   cache.set(key,{data:{...(part==='photo'||part==='all'?{photoStatus:'error'}:{}),status:'error'},expires:Date.now()+60000});
   throw error;
  });pending.set(key,task);task.finally(()=>pending.delete(key)).catch(()=>{});
 }
 if(!signal)return pending.get(key);
 return Promise.race([pending.get(key),new Promise((_,reject)=>{if(signal.aborted)reject(signal.reason);else signal.addEventListener('abort',()=>reject(signal.reason),{once:true});})]);
}
