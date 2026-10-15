<script setup>
import {ref,computed} from 'vue';
import {t,language} from './i18n';
import BrandLogo from './components/BrandLogo.vue';
import LanguageSelector from './components/LanguageSelector.vue';
import ThemeSelector from './components/ThemeSelector.vue';
import HomeView from './views/HomeView.vue';
import TripResultView from './views/TripResultView.vue';
import UnifiedTripMap from './components/UnifiedTripMap.vue';
import {resolveDestinations} from './providers/destinationResolver';
import {getCandidatePlaces} from './providers/placeProvider';
import {normalizePlace} from './planner/place';
import {haversineDistance} from './utils/geo';
const page=ref('home'),settings=ref(null),selectedCity=ref(''),destination=ref(null),candidates=ref([]),places=ref([]),busy=ref(false),error=ref(''),limited=ref(false),pending=ref([]),must=ref([]),active=ref(''),pickNotice=ref(false);
let version=0,action='generate';
const destinationName=city=>language.value==='zh'?city.displayName:city.canonicalName;
function changeCity(value){if(value!==selectedCity.value&&(busy.value||candidates.value.length))cancel();selectedCity.value=value;}
function cancel(){++version;busy.value=false;candidates.value=[];}
async function begin(form,intent='generate'){
 if(busy.value)return;
 action=intent;settings.value=form;selectedCity.value=form.selectedCity;must.value=form.mustPlaces||[];busy.value=true;error.value='';
 const token=++version;
 try{
  const found=await resolveDestinations(form.selectedCity);
  if(token!==version)return;
  if(found.length===1)await choose(found[0],token);else candidates.value=found;
 }catch{if(token===version)error.value='planner.resolveFailed';}
 finally{if(token===version)busy.value=false;}
}
async function choose(city,token=version){
 candidates.value=[];busy.value=true;error.value='';destination.value=city;
 try{
  const data=await getCandidatePlaces(settings.value,city);
  if(token!==version)return;
  // 地点来自另一城市时不继承坐标约束；名字仍作为待匹配要求。
  must.value=must.value.filter(p=>p.countryCode===city.countryCode&&haversineDistance(p,city)<100);
  places.value=[...new Map([...data.places,...must.value].map(p=>[p.id,p])).values()];limited.value=data.limited;
  pending.value=[];
  for(const name of settings.value.wishlist){
   const hits=places.value.filter(p=>[p.name,p.nameZh].some(n=>n?.toLowerCase()===name.toLowerCase()));
   if(hits.length===1&&!must.value.some(p=>p.id===hits[0].id))must.value.push(hits[0]);else if(hits.length!==1)pending.value.push(name);
  }
  settings.value={...settings.value,origin:{latitude:city.latitude,longitude:city.longitude},mustIds:must.value.map(p=>p.id),mustPlaces:must.value};
  page.value=action==='map'?'must':'result';window.scrollTo(0,0);
  data.supplement?.then(extra=>{if(token===version&&destination.value.id===city.id&&extra.length)places.value=[...new Map([...places.value,...extra].map(p=>[p.id,p])).values()];});
 }catch(e){if(token===version)error.value=e.message?.startsWith('OTM_AUTH')?'planner.otmAuth':e.message?.includes('RATE')||e.message?.includes('BUDGET')?'planner.otmLimit':'planner.loadFailed';}
 finally{if(token===version)busy.value=false;}
}
function addMust(raw){const p=normalizePlace(raw,destination.value);if(!places.value.some(v=>v.id===p.id))places.value.push(p);if(!must.value.some(v=>v.id===p.id))must.value.push(p);active.value=p.id;}
function toggleMust(p){if(must.value.some(v=>v.id===p.id))must.value=must.value.filter(v=>v.id!==p.id);else addMust(p);}
function mapPick(point){const found=places.value.filter(p=>haversineDistance(p,point)<.25).sort((a,b)=>haversineDistance(a,point)-haversineDistance(b,point));if(found.length){active.value=found[0].id;document.getElementById('must-'+found[0].id)?.scrollIntoView({behavior:'smooth',block:'center'});}pickNotice.value=!found.length;}
function back(){cancel();settings.value={...settings.value,mustPlaces:must.value};page.value='home';window.scrollTo(0,0);}
</script>
<template><header class="site-header"><div class="header-brand"><BrandLogo/><span>{{t('subtitle')}}</span></div><div class="header-controls"><LanguageSelector/><ThemeSelector/></div></header>
<HomeView v-if="page==='home'" :key="version" :initial="settings" :selected-city="selectedCity" :busy="busy" :search-error="error" @generate="begin($event)" @open-map="begin($event,'map')" @cancel="cancel" @update:selected-city="changeCity"/>
<div v-if="candidates.length" class="destination-overlay" role="dialog" aria-modal="true" :aria-label="t('planner.chooseCity')"><section><h2>{{t('planner.chooseCity')}}</h2><p>{{t('planner.chooseHint')}}</p><button class="outline city-option" v-for="city in candidates" :key="city.id" @click="choose(city)">{{destinationName(city)}} · {{city.country}} · {{city.region}}</button><button class="text-button" @click="cancel">{{t('planner.close')}}</button></section></div>
<main v-if="page==='must'" class="must-page"><div class="must-heading"><div><h1>{{t('planner.pickTitle')}}</h1><p>{{t('planner.pickHint')}}</p></div><button class="primary" @click="back">{{t('planner.done')}}</button></div><p v-if="limited" class="data-notice">{{t('planner.snapshot')}}</p><p v-if="places.some(p=>p.source==='openstreetmap')"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors · ODbL</a></p><div class="must-layout"><UnifiedTripMap :destination="destination" :places="places" :active="active" selecting @select="active=$event" @add="addMust" @pick="mapPick"/><section><p v-if="pickNotice">{{t('planner.noNearby')}}</p><h2>{{t('planner.candidate')}}</h2><article v-for="place in places" :key="place.id" :id="'must-'+place.id" :class="{selected:active===place.id}"><strong>{{place.name}}</strong><p>{{place.address}}</p><small v-if="place.isOutskirts">{{t('planner.outskirts')}}</small><button class="outline" @click="toggleMust(place)">{{t(must.some(p=>p.id===place.id)?'planner.mustAdded':'planner.add')}}</button></article></section></div></main>
<TripResultView v-if="page==='result'" :settings="settings" :destination="destination" :places="places" :limited="limited" :pending="pending" @back="back"/>
<footer class="site-footer"><span>© {{new Date().getFullYear()}} Pathly</span><span>{{t('saved')}}</span></footer></template>
<style>.destination-overlay{position:fixed;inset:0;z-index:2000;background:#0005;display:grid;place-items:center;padding:20px}.destination-overlay>section{background:var(--surface);padding:24px;border-radius:18px;max-width:650px;max-height:85vh;overflow:auto}.city-option{display:block;width:100%;text-align:left;margin:8px 0}.must-page{max-width:1400px;margin:auto;padding:30px 3%}.must-heading{display:flex;justify-content:space-between;align-items:center;gap:20px}.must-layout{display:grid;grid-template-columns:1fr 1fr;gap:24px}.must-layout article{padding:16px;border:1px solid var(--border);border-radius:12px;margin-bottom:12px}.must-layout article.selected{border-color:var(--primary);background:var(--primary-soft)}.must-layout p{color:var(--text-secondary);font-size:13px}.data-notice{font-size:13px;color:var(--text-secondary);line-height:1.7}@media(max-width:760px){.must-layout{grid-template-columns:1fr}.must-heading{flex-direction:column;align-items:start}}</style>
