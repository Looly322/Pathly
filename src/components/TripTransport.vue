<script setup>
import {ref,computed,watch,onBeforeUnmount} from 'vue';
import {placeName} from '../utils/globalLabels';
import {t,language} from '../i18n';
import {getTransportOptions} from '../services/transportService';
import {transitUrl} from '../utils/transit';
import TransportRoutes from './TransportRoutes.vue';
const emit=defineEmits(['paths']);
const props=defineProps({places:Array,destination:Object});
const legs=ref([]),loading=ref(false),planned=ref(false),mode=ref('transit');
let version=0;
watch(legs,()=>emit('paths',legs.value.flatMap(l=>l.options?.[l.chosen||0]?.segments||[]).filter(s=>s.path?.length>=2)),{deep:true});
onBeforeUnmount(()=>{++version;});
async function query(){
 const token=++version;loading.value=true;planned.value=true;legs.value=[];
 for(let i=1;i<props.places.length;i++){
  const from=props.places[i-1],to=props.places[i];
  try{const data=await getTransportOptions(from,to,props.destination.displayName,mode.value);if(token!==version)return;legs.value.push({...data,from,to,chosen:0});}
  catch{if(token===version)legs.value.push({from,to,options:[],transitStatus:'error',chosen:0});}
 }
 if(token===version)loading.value=false;
}
watch(()=>props.places.map(p=>[p.id,p.latitude,p.longitude].join(',')).join('|'),()=>{++version;legs.value=[];planned.value=false;loading.value=false;});
watch(mode,query);
</script>
<template><section v-if="places.length>1"><template v-if="destination.countryCode==='CN'"><button class="outline" :disabled="loading" @click="query">{{t('planner.queryTransport')}}</button><TransportRoutes v-if="planned" :legs="legs" :loading="loading" :planned="planned" v-model:mode="mode" @retry="query" @choose="(i,n)=>legs[i].chosen=n"/></template><template v-else><h3>{{t('planner.externalTransit')}}</h3><p>{{t('planner.externalTransitNote')}}</p><a v-for="(place,i) in places.slice(1)" :key="place.id" :href="transitUrl(places[i],place,language)" target="_blank" rel="noopener noreferrer">{{i+1}} → {{i+2}} · {{placeName(places[i])}} → {{placeName(place)}} ↗</a></template></section></template>
<style scoped>section{margin-top:18px;padding:16px;border:1px solid var(--border);border-radius:12px}p,a{font-size:12px;line-height:1.7}a{display:block;margin-top:8px;overflow-wrap:anywhere}</style>
