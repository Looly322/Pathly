<script setup>
import {ref,watch,onBeforeUnmount} from 'vue';
import {language} from '../i18n';
import {weatherCoordinates} from '../services/weatherService';
const props=defineProps({destination:Object});
const photo=ref(null),status=ref('loading'),fallback=ref(false);let controller,version=0,timer;
watch(()=>[props.destination.id,props.destination.latitude,props.destination.longitude].join('|'),async()=>{
 const run=++version;controller?.abort();controller=new AbortController();clearTimeout(timer);timer=setTimeout(()=>controller.abort(),25000);
 photo.value=null;status.value='loading';fallback.value=false;
 try{const p=props.destination;const r=await fetch('/api/commons-image?'+new URLSearchParams({...weatherCoordinates(p),name:p.canonicalName||p.displayName||p.city,kind:'city',country:p.country||'',wikidata:p.wikidata||''}),{signal:controller.signal});if(!r.ok)throw Error();const data=await r.json();if(run!==version)return;photo.value=data.photo||null;status.value=photo.value?'loading':'missing';clearTimeout(timer);if(photo.value)timer=setTimeout(failed,15000);}catch{if(run===version)status.value='missing';}finally{if(run===version&&!photo.value)clearTimeout(timer);}
},{immediate:true});
function loaded(){clearTimeout(timer);status.value='ready';}
function failed(){clearTimeout(timer);if(photo.value?.fallbackUrl&&!fallback.value){fallback.value=true;timer=setTimeout(failed,12000);}else status.value='missing';}
onBeforeUnmount(()=>{++version;controller?.abort();clearTimeout(timer);});
</script>
<template><figure class="journey-cover-photo"><div class="cover-frame"><img v-if="photo&&status!=='missing'" :src="fallback?photo.fallbackUrl:photo.url" :alt="destination.displayName||destination.city" fetchpriority="high" decoding="async" @load="loaded" @error="failed"/><div v-if="status!=='ready'" class="cover-placeholder" role="status"><span>PATHLY / TRAVEL JOURNAL</span><p>{{language==='zh'?(status==='loading'?'正在展开这座城市的风景…':'城市摄影暂不可用'):(status==='loading'?'Opening a window onto your destination…':'City photograph unavailable')}}</p></div></div><figcaption v-if="photo&&status==='ready'"><span>{{language==='zh'?'目的地影像':'Destination portrait'}}</span><a :href="photo.page" target="_blank" rel="noopener noreferrer">{{photo.author}} · {{photo.license}} ↗</a></figcaption></figure></template>
<style scoped>
.journey-cover-photo{margin:0;min-width:0}.cover-frame{position:relative;aspect-ratio:1.32;background:#e9e7dc;overflow:hidden}.cover-frame>img{width:100%;height:100%;object-fit:cover;display:block}.cover-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:30px;color:#53675a;background:#e9e7dc;text-align:center}.cover-placeholder span{font-family:Georgia,serif;letter-spacing:.15em;font-size:12px}.cover-placeholder p{font-size:13px;margin-top:16px}.journey-cover-photo figcaption{display:flex;justify-content:space-between;gap:16px;font-size:10px;line-height:1.6;margin-top:12px;color:#657468}.journey-cover-photo a{color:inherit;text-align:right;max-width:75%}
</style>
