<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { t, language } from '../i18n';
import { searchPlaces } from '../services/placeService.js';
const props = defineProps({city:String,cityCode:String,enabled:Boolean,selectedPlaces:Array,wishlist:{type:Array,default:()=>[]}});
const emit = defineEmits(['view','add']);
const keyword=ref(''),results=ref([]),loading=ref(false),state=ref('idle');
let requestId=0;
function invalidate(){requestId++;results.value=[];loading.value=false;state.value='idle';}
watch(()=>[props.city,props.cityCode,props.enabled],invalidate);
onBeforeUnmount(()=>requestId++);
async function search(value) {
  if (typeof value === 'string') keyword.value=value;
  if (!props.enabled || !keyword.value.trim()) return;
  const current=++requestId;loading.value=true;results.value=[];state.value='idle';
  try {
    const places=await searchPlaces(props.city,keyword.value,{cityCode:props.cityCode,language:language.value});
    // 切换城市或发起新搜索后，旧请求不能覆盖新城市的结果。
    if(current!==requestId)return;
    results.value=places;state.value=places.length?'success':'empty';
  } catch {if(current===requestId)state.value='error';}
  finally {if(current===requestId)loading.value=false;}
}
const isSelected = place => props.selectedPlaces.some(p=>p.id===place.id);
</script>
<template><section class="poi-search-panel" :aria-label="t('map.search')">
  <h2>{{t('map.search')}}</h2><p>{{t('map.searchHint')}}</p>
  <form class="map-search-form" @submit.prevent="search()"><input v-model="keyword" :aria-label="t('map.search')" :placeholder="t('map.searchPlaceholder')" maxlength="100" :disabled="!enabled"><button class="primary" :disabled="!enabled||!keyword.trim()||loading">{{t(loading?'map.searching':'map.search')}}</button></form>
  <div v-if="wishlist.length" class="wishlist-search"><small>{{t('map.wishlistHint')}}</small><button v-for="name in wishlist" :key="name" class="chip" :disabled="!enabled||loading" @click="search(name)">{{name}}</button></div>
  <p v-if="!enabled" class="search-status">{{t('map.cityBusy')}}</p>
  <p v-if="loading" role="status" class="search-status">{{t('map.searching')}}</p>
  <p v-else-if="state==='empty'||state==='error'" :role="state==='error'?'alert':'status'" class="search-status">{{t(state==='error'?'map.searchError':'map.searchEmpty')}}</p>
  <template v-else-if="results.length"><div class="search-count">{{t('map.searchCount',{n:results.length})}}</div>
  <ol class="poi-results"><li v-for="place in results" :key="place.id" class="poi-result"><div><h3>{{place.name}}</h3><span class="poi-source">{{t('map.poi')}}</span></div><p>{{place.type||t('map.poi')}}</p><p>{{place.address||t('map.addressUnknown')}}</p><small>{{t('map.coordinates')}} {{place.longitude.toFixed(5)}}, {{place.latitude.toFixed(5)}}</small><small v-if="place.distance!=null">{{t('map.distance')}} {{(place.distance/1000).toFixed(2)}} km</small><div class="poi-actions"><button class="outline" @click="emit('view',place)">{{t('map.view')}}</button><button class="primary" :disabled="isSelected(place)" @click="emit('add',place)">{{t(isSelected(place)?'map.added':'map.add')}}</button></div></li></ol></template>
</section></template>
