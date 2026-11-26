<script setup>
import {tripDraft,updateDraft,newDraft} from './state/tripDraft';
import LibraryView from './views/LibraryView.vue';
import {dedupePlaces,matchWish} from './planner/identity';
import {ref,computed,watch,nextTick,onBeforeUnmount} from 'vue';
import {getWeather} from './services/weatherService';
import {searchErrorKey} from './services/apiClient';
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
const page=ref('home'),settings=ref(JSON.parse(JSON.stringify(tripDraft))),selectedCity=ref(tripDraft.selectedCity),destination=ref(null),candidates=ref([]),places=ref([]),busy=ref(false),error=ref(''),limited=ref(false),pending=ref([]),must=ref([]),active=ref(''),pickNotice=ref(false);
const restored=ref(null),latestSnapshot=ref(null),resultKey=ref(0),returnPage=ref('home');
const dataWarnings=ref([]);
let version=0,action='generate';
const destinationName=city=>language.value==='zh'?city.displayName:city.canonicalName;
function changeCity(value){if(value!==selectedCity.value&&(busy.value||candidates.value.length))cancel();selectedCity.value=value;}
function cancel(){++version;busy.value=false;candidates.value=[];}
async function begin(form,intent='generate'){
 if(busy.value)return;
 restored.value=null;resultKey.value++;action=intent;updateDraft(form);settings.value=form;selectedCity.value=form.selectedCity;must.value=form.mustPlaces||[];busy.value=true;error.value='';
 const token=++version;
 try{
  const found=await resolveDestinations(form.selectedCity);
  if(token!==version)return;
  if(found.length===1)await choose(found[0],token);else candidates.value=found;
 }catch(e){if(token===version)error.value=searchErrorKey(e,'planner.resolveFailed');}
 finally{if(token===version)busy.value=false;}
}
async function choose(city,token=version){
 candidates.value=[];busy.value=true;error.value='';destination.value=city;
 try{
  const weatherJob=getWeather(city).catch(()=>null);
  const data=await getCandidatePlaces(settings.value,city);
  const weather=await Promise.race([weatherJob,new Promise(r=>setTimeout(()=>r(null),2000))]);
  if(token!==version)return;
  // 地点来自另一城市时不继承坐标约束；名字仍作为待匹配要求。
  const previousMust=must.value;must.value=must.value.filter(p=>(!p.countryCode||p.countryCode===city.countryCode)&&haversineDistance(p,city)<100);
  places.value=dedupePlaces([...data.places,...must.value],must.value.map(p=>p.id));limited.value=data.limited;dataWarnings.value=data.warnings||[];
  pending.value=previousMust.filter(p=>!must.value.includes(p)).map(p=>p.name+(language.value==='zh'?'（与目的地距离过远或国家不符，请在地图重新选择）':' (outside destination area; select again on the map)'));
  for(const name of settings.value.wishlist){
   const hits=matchWish(places.value,name);
   if(hits.length===1&&!must.value.some(p=>p.id===hits[0].id))must.value.push(hits[0]);else if(hits.length!==1)pending.value.push(name);
  }
  settings.value={...settings.value,weather,currency:'CNY',origin:settings.value.hotel||{latitude:city.latitude,longitude:city.longitude},mustIds:must.value.map(p=>p.id),mustPlaces:must.value};
  page.value=action==='map'?'must':'result';window.scrollTo(0,0);
  data.supplement?.then(extra=>{if(token===version&&destination.value.id===city.id&&extra.length)places.value=[...new Map([...places.value,...extra].map(p=>[p.id,p])).values()];});
 }catch(e){if(token===version)error.value=searchErrorKey(e);}
 finally{if(token===version)busy.value=false;}
}
function syncMust(){settings.value={...settings.value,mustPlaces:must.value,mustIds:must.value.map(p=>p.id)};updateDraft({...tripDraft,mustPlaces:must.value});}
function addMust(raw){const p=normalizePlace(raw,destination.value);if(!places.value.some(v=>v.id===p.id))places.value.push(p);if(!must.value.some(v=>v.id===p.id))must.value.push(p);active.value=p.id;syncMust();}
function toggleMust(p){if(must.value.some(v=>v.id===p.id))must.value=must.value.filter(v=>v.id!==p.id);else addMust(p);syncMust();}
function mapPick(point){const found=places.value.filter(p=>haversineDistance(p,point)<.25).sort((a,b)=>haversineDistance(a,point)-haversineDistance(b,point));if(found.length){active.value=found[0].id;document.getElementById('must-'+found[0].id)?.scrollIntoView({behavior:'smooth',block:'center'});}pickNotice.value=!found.length;}
function back(){cancel();if(page.value==='result'&&latestSnapshot.value){settings.value=latestSnapshot.value.settings;must.value=settings.value.mustPlaces||[];}settings.value={...settings.value,mustPlaces:must.value};updateDraft(settings.value);page.value='home';window.scrollTo(0,0);}
function openLibrary(kind){returnPage.value=page.value==='result'?'result':'home';page.value=kind;window.scrollTo(0,0);}
function openSnapshot(value,copy=false){const snap=JSON.parse(JSON.stringify(value));if(copy)snap.routeId=crypto.randomUUID();restored.value=snap;latestSnapshot.value=snap;settings.value=snap.settings;destination.value=snap.destination;places.value=snap.places;must.value=snap.settings.mustPlaces||[];selectedCity.value=snap.destination.city;pending.value=[];dataWarnings.value=[];resultKey.value++;page.value='result';window.scrollTo(0,0);}
function leaveLibrary(){if(returnPage.value==='result'&&latestSnapshot.value)openSnapshot(latestSnapshot.value);else page.value='home';}
function addFavorite(entry){const p=entry.data;if(!settings.value||!destination.value){settings.value={selectedCity:p.city,hotel:null,restaurants:[],mustPlaces:[],wishlist:[]};selectedCity.value=p.city;}else if((p.countryCode&&destination.value.countryCode!==p.countryCode)||haversineDistance(p,destination.value)>100){alert(language.value==='zh'?'请先创建同一目的地的旅行计划。':'Create a trip for this destination first.');return;}
 if(entry.type==='hotel')settings.value={...settings.value,hotel:p};else if(entry.type==='restaurant')settings.value={...settings.value,restaurants:dedupePlaces([...(settings.value.restaurants||[]),p])};else{must.value=dedupePlaces([...(settings.value.mustPlaces||[]),p]);settings.value={...settings.value,mustPlaces:must.value};}
 updateDraft(settings.value);page.value='home';restored.value=null;setTimeout(()=>document.getElementById('trip-planner')?.scrollIntoView(),0);
}
function receiveSnapshot(value){latestSnapshot.value=value;if(value.settings.visitPreferences)updateDraft({...tripDraft,visitPreferences:value.settings.visitPreferences});}
function exitTrip(){cancel();newDraft();settings.value=JSON.parse(JSON.stringify(tripDraft));selectedCity.value='';destination.value=null;places.value=[];must.value=[];pending.value=[];active.value='';error.value='';dataWarnings.value=[];latestSnapshot.value=null;restored.value=null;limited.value=false;pickNotice.value=false;resultKey.value++;page.value='home';window.scrollTo(0,0);}
function startNew(){if(!confirm(language.value==='zh'?'新建旅行草稿？历史和收藏将保留。':'Start a new draft? History and favorites will remain.'))return;exitTrip();}
// Existing app uses conditional views, not Vue Router. Record these transitions natively.
let navigating=false;
window.history.replaceState({...window.history.state,pathlyPage:'home'},'');
watch(page,value=>{if(!navigating)window.history.pushState({...window.history.state,pathlyPage:value},'');},{flush:'sync'});
function browserNavigate(event){cancel();navigating=true;const target=event.state?.pathlyPage||'home';if(target==='must'&&destination.value&&places.value.length)page.value='must';else if(target==='result'&&latestSnapshot.value)openSnapshot(latestSnapshot.value);else page.value=['history','favorites'].includes(target)?target:'home';navigating=false;}
window.addEventListener('popstate',browserNavigate);onBeforeUnmount(()=>window.removeEventListener('popstate',browserNavigate));
</script>
<template><header class="site-header" :class="{'home-header':page==='home'}"><div class="header-brand"><BrandLogo/><span>{{t('subtitle')}}</span></div><nav v-if="page==='home'" class="home-nav" :aria-label="language==='zh'?'首页导航':'Home navigation'"><a href="#travel-interests">{{language==='zh'?'寻找灵感':'Inspiration'}}</a><a href="#travel-destinations">{{language==='zh'?'探索目的地':'Destinations'}}</a><a href="#trip-planner">{{language==='zh'?'规划旅程':'Plan a journey'}} ↗</a></nav><div class="header-controls"><button v-if="page!=='home'||tripDraft.selectedCity" class="text-button" @click="exitTrip">{{language==='zh'?'退出旅行，返回首页':'Exit trip · Home'}}</button><button class="text-button" @click="startNew">{{language==='zh'?'新建计划':'New trip'}}</button><button class="text-button" @click="openLibrary('history')">{{language==='zh'?'历史记录':'History'}}</button><button class="text-button" @click="openLibrary('favorites')">{{language==='zh'?'收藏夹':'Favorites'}}</button><LanguageSelector/><ThemeSelector/></div></header>
<HomeView v-if="page==='home'" :initial="settings" :selected-city="selectedCity" :busy="busy" :search-error="error" @generate="begin($event)" @open-map="begin($event,'map')" @cancel="cancel" @update:selected-city="changeCity"/>
<div v-if="candidates.length" class="destination-overlay" role="dialog" aria-modal="true" :aria-label="t('planner.chooseCity')"><section><h2>{{t('planner.chooseCity')}}</h2><p>{{t('planner.chooseHint')}}</p><button class="outline city-option" v-for="city in candidates" :key="city.id" @click="choose(city)">{{destinationName(city)}} · {{city.country}} · {{city.region}}</button><button class="text-button" @click="cancel">{{t('planner.close')}}</button></section></div>
<main v-if="page==='must'" class="must-page"><div class="must-heading"><div><h1>{{t('planner.pickTitle')}}</h1><p>{{t('planner.pickHint')}}</p></div><button class="primary" @click="back">{{t('planner.done')}}</button></div><p v-if="limited" class="data-notice">{{t('planner.snapshot')}}</p><p v-if="places.some(p=>p.source==='openstreetmap')"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors · ODbL</a></p><div class="must-layout"><UnifiedTripMap :destination="destination" :places="places" :active="active" selecting @select="active=$event" @add="addMust" @pick="mapPick"/><section><p v-if="pickNotice">{{t('planner.noNearby')}}</p><h2>{{t('planner.candidate')}}</h2><article v-for="place in places" :key="place.id" :id="'must-'+place.id" :class="{selected:active===place.id}"><strong>{{place.name}}</strong><p>{{place.address}}</p><small v-if="place.isOutskirts">{{t('planner.outskirts')}}</small><button class="outline" @click="toggleMust(place)">{{t(must.some(p=>p.id===place.id)?'planner.mustAdded':'planner.add')}}</button></article></section></div></main>
<LibraryView v-if="['history','favorites'].includes(page)" :key="page" :kind="page" @back="leaveLibrary" @open="openSnapshot" @add="addFavorite"/><TripResultView :key="resultKey" :restored="restored" @snapshot="receiveSnapshot" v-if="page==='result'" :settings="settings" :destination="destination" :places="places" :limited="limited" :pending="pending" :data-warnings="dataWarnings" @back="back"/>
<footer class="site-footer"><span>© {{new Date().getFullYear()}} Pathly</span><span>{{t('saved')}}</span></footer></template>
<style>.destination-overlay{position:fixed;inset:0;z-index:2000;background:#0005;display:grid;place-items:center;padding:20px}.destination-overlay>section{background:var(--surface);padding:24px;border-radius:18px;max-width:650px;max-height:85vh;overflow:auto}.city-option{display:block;width:100%;text-align:left;margin:8px 0}.must-page{max-width:1400px;margin:auto;padding:30px 3%}.must-heading{display:flex;justify-content:space-between;align-items:center;gap:20px}.must-layout{display:grid;grid-template-columns:1fr 1fr;gap:24px}.must-layout article{padding:16px;border:1px solid var(--border);border-radius:12px;margin-bottom:12px}.must-layout article.selected{border-color:var(--primary);background:var(--primary-soft)}.must-layout p{color:var(--text-secondary);font-size:13px}.data-notice{font-size:13px;color:var(--text-secondary);line-height:1.7}@media(max-width:760px){.must-layout{grid-template-columns:1fr}.must-heading{flex-direction:column;align-items:start}}</style>

<style>.site-header.home-header{position:absolute;z-index:20;top:0;left:0;width:100%;height:100px;min-height:0;padding:0 5vw;border-bottom:1px solid #ffffff30;background:transparent;color:white}.home-header .header-brand>span:not(.brand){display:none}.home-header .brand{color:white}.home-header .home-nav{display:flex;gap:32px;margin-left:auto;margin-right:45px}.home-nav a{color:white;text-decoration:none;font-size:12px;letter-spacing:.06em}.home-header .header-controls{gap:20px}.home-header .language button{color:#fff9}.home-header .language button.active{color:white}.home-header .theme-trigger{color:white}.home-header .theme-popover{color:var(--text-primary)}@media(max-width:850px){.home-header .home-nav{gap:18px;margin-right:25px}.home-nav a{font-size:11px}}@media(max-width:700px){.site-header.home-header{height:82px;padding:0 6vw;flex-wrap:nowrap}.home-header .home-nav{display:none}.home-header .header-controls{margin-left:auto;gap:10px}.home-header .brand{font-size:26px}} </style>
<style>.home-header .brand svg,.home-header .brand-dot{color:#e5f1db}.home-header .language .active{color:#fff}.home-header .language span{color:#fff7}</style>

<style>
.site-header.home-header{animation:home-nav-enter .7s cubic-bezier(.22,1,.36,1) .8s both}
.site-header.home-header:focus-within{animation:none}
@keyframes home-nav-enter{from{opacity:0;transform:translateY(25px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){.site-header.home-header{animation:none}}
</style>
<style>@media(max-width:700px){.header-controls>.text-button{font-size:11px;padding:3px;min-width:0}.site-header .header-controls{gap:3px;flex-wrap:wrap}.home-header .header-brand{flex-shrink:0}.site-header.home-header .brand{font-size:22px}}</style>
