<script setup>
import {ref,computed,reactive,nextTick,onMounted,onBeforeUnmount} from 'vue';
import {transitUrl} from '../utils/transit';
import {totalStraightDistance} from '../utils/geo';
import GlobalPlacePhoto from '../components/GlobalPlacePhoto.vue';
import GlobalMap from '../components/GlobalMap.vue';
import {cityName,countryName,regionName,placeName,categoryLabel} from '../utils/globalLabels';
import {t,language} from '../i18n';
import {searchDestinations,searchGlobalPlaces} from '../services/globalPlaceService.js';
const props = defineProps({ initialQuery: String, initialDestinations: Array });
const emit = defineEmits(['back', 'domestic']);
const input = ref(props.initialQuery || ''), candidates = ref(props.initialDestinations || []);
const destination = ref(null), places = ref([]), busy = ref(false), error = ref(''), searched = ref(false);
const query = ref(''), category = ref('attractions'), queryUsed = ref('');
const selectedId = ref('');
const nearby=ref([]), picking=ref(false), pickError=ref('');
let pickVersion=0;
const cityRoutes = reactive({}), activeTab = ref('discover'), changingCity = ref(false), draft = ref(null);
const route = computed(() => cityRoutes[destination.value?.id] || []);
const mapPlaces = computed(() => [...route.value, ...places.value.filter(p => !route.value.some(s => s.id === p.id))]);
const routeDistance = computed(() => totalStraightDistance(route.value).toFixed(1));
const numberOf = (p) => mapPlaces.value.findIndex(s => s.id === p.id) + 1;
function addPlace(p) { const list = cityRoutes[destination.value.id] ||= []; if (!list.some(s=>s.id===p.id)) list.push(p); }
function removePlace(id) { cityRoutes[destination.value.id] = route.value.filter(p=>p.id!==id); }
function movePlace(index, delta) { const list=route.value; if(index+delta<0 || index+delta>=list.length) return; [list[index],list[index+delta]]=[list[index+delta],list[index]]; }
async function pickPoint(point) {
  const token=++pickVersion;
  draft.value=point; nearby.value=[]; picking.value=true; pickError.value=''; activeTab.value='route';
  await nextTick();
  document.querySelector('.custom-point')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  try {
    const result=await searchGlobalPlaces({destination:{...destination.value,...point},radius:250,limit:10});
    if(token===pickVersion) nearby.value=result.places;
  } catch { if(token===pickVersion) pickError.value='global.pickFailed'; }
  finally { if(token===pickVersion) picking.value=false; }
}
function chooseNearby(place){addPlace(place);selectedId.value=place.id;draft.value=null;++pickVersion;}
let version = 0;
function showOnMap(id) { selectedId.value = id; document.querySelector('.world-map')?.scrollIntoView({behavior:'smooth',block:'center'}); }
function selectPlace(id) { selectedId.value = id; activeTab.value = places.value.some(p=>p.id===id) ? 'discover' : 'route'; document.getElementById('global-' + id)?.scrollIntoView({behavior:'smooth',block:'nearest'}); }
async function loadPhoto(place, token=version) {
  place.photoStatus='loading';
  try {
    const r=await fetch('/api/places/localize?'+new URLSearchParams({name:place.name,latitude:place.latitude,longitude:place.longitude,city:destination.value?.city || '',category:place.categories?.[0]?.name || '',image:1}),{signal:AbortSignal.timeout(60000)});
    if(!r.ok) throw new Error();
    const data=await r.json();
    if(token===version) Object.assign(place,data,{photoStatus:data.photo ? 'ready' : (data.photoStatus || 'missing')});
  } catch { if(token===version) place.photoStatus='error'; }
}
async function localize(items,token) {
  for(const place of items) {
    if(token!==version) return;
    await loadPhoto(place,token);
  }
}
const categories = ['attractions','museums','parks','landmarks','restaurants','coffee','shopping','entertainment'];
function invalidate() { ++version; busy.value = false; error.value = ''; places.value = []; searched.value = false; }
function cityChanged() { invalidate(); destination.value = null; candidates.value = []; }
async function findCity() {
  if (!input.value.trim()) return;
  invalidate(); destination.value = null; candidates.value = []; busy.value = true;
  const token = version;
  try {
    const found = await searchDestinations(input.value.trim());
    if (token !== version) return;
    candidates.value = found;
    if (!found.length) error.value = 'global.noCity';
  } catch { if (token === version) error.value = 'global.failed'; }
  finally { if (token === version) busy.value = false; }
}
async function choose(city) {
  invalidate(); ++pickVersion; draft.value=null; changingCity.value=false; activeTab.value='discover'; destination.value = city; query.value = ''; category.value = 'attractions';
  await search();
}
async function search() {
  if (!destination.value) return;
  invalidate(); busy.value = true;
  const token = version;
  try {
    const result = await searchGlobalPlaces({ destination: destination.value, query: query.value.trim(), category: query.value.trim() ? '' : category.value });
    if (token !== version) return;
    places.value = result.places.map(p=>({...p,photoStatus:'loading'})); selectedId.value = ''; queryUsed.value = result.queryUsed; searched.value = true;
    if (destination.value.countryCode !== 'CN') localize(places.value, token);
  } catch (e) { if (token === version) error.value = e.message === 'GLOBAL_429' ? 'global.quota' : 'global.failed'; }
  finally { if (token === version) busy.value = false; }
}
function safeWebsite(url) { try { const u = new URL(url); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; } }
onMounted(() => { if (!candidates.value.length && input.value) findCity(); });
onBeforeUnmount(() => { ++version; ++pickVersion; });
</script>
<template>
  <main class="global-page">
    <div class="global-heading"><div><button class="text-button" @click="emit('back')">← {{ t('global.back') }}</button><h1>{{ destination ? cityName(destination) + ' · ' + countryName(destination) : t('global.title') }}</h1><p>{{ t('global.workspaceIntro') }}</p></div><button v-if="destination" class="outline" @click="changingCity=!changingCity">{{ t('global.changeCity') }}</button></div>
    <section v-if="!destination || changingCity" class="city-picker">
      <form class="global-search" @submit.prevent="findCity"><label>{{ t('global.destination') }}<input v-model="input" :placeholder="t('global.placeholder')" required /></label><button class="primary" :disabled="busy">{{ t('global.findCity') }}</button></form>
      <section v-if="candidates.length" class="global-candidates" :aria-label="t('global.choose')"><p>{{ t('global.choose') }}</p><button v-for="city in candidates" :key="city.id" class="outline" @click="choose(city)">{{ cityName(city) }} · {{ regionName(city) }} · {{ countryName(city) }} ({{ city.countryCode }})</button></section>
    </section>
    <p v-if="!destination && busy" role="status">{{ t('global.loading') }}</p><p v-if="!destination && error" role="alert">{{ t(error) }}</p>
    <div v-if="destination" class="global-workspace">
      <aside class="global-map-column">
        <GlobalMap v-if="destination.countryCode !== 'CN'" :destination="destination" :places="mapPlaces" :route="route" :selected-id="selectedId" @select="selectPlace" @pick="pickPoint" />
        <button v-else class="primary" @click="emit('domestic',destination)">{{ t('global.domestic') }}</button>
        <div class="route-overview"><strong>{{ t('global.routeOrder') }}</strong><span>{{ route.length }} {{ t('global.stops') }} · {{ routeDistance }} km</span><p>{{ t('global.routeDisclaimer') }}</p><section class="transit-legs"><h3>{{t('global.transitTitle')}}</h3><p>{{t('global.transitNote')}}</p><p v-if="route.length<2">{{t('global.transitEmpty')}}</p><a v-for="(place,index) in route.slice(1)" :key="place.id" :href="transitUrl(route[index],place)" target="_blank" rel="noopener noreferrer">{{index+1}} → {{index+2}} · {{placeName(route[index])}} → {{placeName(place)}}<br/>{{t('global.transitOpen')}} ↗</a></section></div>
      </aside>
      <section class="global-sidebar">
        <div class="global-tabs"><button :aria-pressed="activeTab==='discover'" @click="activeTab='discover'">{{ t('global.discover') }}</button><button :aria-pressed="activeTab==='route'" @click="activeTab='route'">{{ t('global.myRoute') }} · {{ route.length }}</button></div>
        <template v-if="activeTab==='discover'">
          <form class="global-search poi-search" @submit.prevent="search"><label>{{ t('global.poi') }}<input v-model="query" :placeholder="t('global.poiPlaceholder')" /></label><label>{{ t('global.category') }}<select :aria-label="t('global.category')" v-model="category" @change="query=''; search()"><option v-for="item in categories" :key="item" :value="item">{{ t('global.categories.'+item) }}</option></select></label><button class="primary" :disabled="busy">{{ t('global.search') }}</button></form>
          <p v-if="busy" role="status">{{ t('global.loading') }}</p><p v-if="error" role="alert">{{ t(error) }}</p><p v-if="searched && !places.length">{{ t('global.empty') }}</p>
          <div class="global-grid"><article v-for="place in places" :key="place.id" :id="'global-'+place.id" class="global-place" :class="{selected:selectedId===place.id}">
            <GlobalPlacePhoto :place="place" @retry="loadPhoto(place)" />
            <div class="place-copy"><small>{{ categoryLabel(place) }}</small><h3>{{ numberOf(place) }}. {{ placeName(place) }}</h3><p v-if="language==='zh' && placeName(place)!==place.name" class="original-name">{{ place.name }}</p><p>{{ place.address || t('global.unknown') }}</p><div class="card-actions"><button class="primary" :disabled="route.some(p=>p.id===place.id)" @click="addPlace(place)">{{ route.some(p=>p.id===place.id)?t('global.added'):t('global.addRoute') }}</button><button class="outline" @click="showOnMap(place.id)">{{ t('global.onMap') }}</button><a v-if="safeWebsite(place.website)" :href="safeWebsite(place.website)" target="_blank" rel="noopener noreferrer">{{ t('global.website') }} ↗</a></div></div>
          </article></div>
        </template>
        <template v-else>
          <section v-if="draft" class="custom-point"><h3>{{t('global.nearbyTitle')}}</h3><p>{{t('global.nearbyNote')}}</p><p v-if="picking" role="status">{{t('global.loading')}}</p><p v-else-if="pickError" role="alert">{{t(pickError)}} <button @click="pickPoint(draft)">{{t('global.retry')}}</button></p><p v-else-if="!nearby.length">{{t('global.noNearby')}}</p><button v-for="place in nearby" :key="place.id" class="outline nearby-choice" @click="chooseNearby(place)"><strong>{{place.name}}</strong><small>{{place.address}}</small></button><button class="text-button" @click="draft=null;++pickVersion">{{t('global.cancelPoint')}}</button></section>
          <p v-if="!route.length">{{ t('global.emptyRoute') }}</p>
          <article v-for="(place,index) in route" :key="place.id" :id="'global-'+place.id" class="route-stop" :class="{selected:selectedId===place.id}"><span class="route-number">{{ index+1 }}</span><div><h3>{{ placeName(place) }}</h3><small v-if="place.source==='custom'">{{ t('global.customPoint') }}</small><div class="card-actions"><button class="outline" :disabled="index===0" @click="movePlace(index,-1)">{{ t('global.moveUp') }}</button><button class="outline" :disabled="index===route.length-1" @click="movePlace(index,1)">{{ t('global.moveDown') }}</button><button class="outline" @click="showOnMap(place.id)">{{ t('global.onMap') }}</button><button class="text-button" @click="removePlace(place.id)">{{ t('global.remove') }}</button></div></div></article>
          <p class="session-note">{{ t('global.sessionNote') }}</p>
        </template>
      </section>
    </div>
    <p class="global-attribution">{{ t('global.attribution') }} <a href="https://open-meteo.com/">Open-Meteo / GeoNames</a> · <a href="https://www.wikidata.org/">Wikidata</a> · <a href="https://commons.wikimedia.org/">Wikimedia Commons</a> · <a href="https://foursquare.com/">Foursquare</a></p>
  </main>
</template>
<style scoped>
.global-page{max-width:1440px;margin:auto;padding:24px 3%}.global-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}.global-heading h1{font-size:32px;margin:12px 0 8px}.global-heading p{color:var(--text-secondary);margin:0}.global-workspace{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:24px;align-items:start}.global-map-column{position:sticky;top:16px;min-width:0}.global-map-column :deep(.world-map){margin:0}.global-map-column :deep(.world-map-canvas){height:clamp(380px,65vh,700px)}.route-overview{padding:20px;border:1px solid var(--border);border-radius:14px;margin-top:16px}.route-overview span{float:right}.route-overview p,.session-note{font-size:12px;color:var(--text-secondary);line-height:1.6}.global-sidebar{min-width:0}.global-tabs{display:flex;border-bottom:1px solid var(--border);gap:20px}.global-tabs button{border:0;border-bottom:3px solid transparent;background:none;padding:14px 4px;font-weight:600}.global-tabs button[aria-pressed=true]{color:var(--primary);border-bottom-color:var(--primary)}.global-search{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:20px 0}.global-search label{flex:1;min-width:140px;display:grid;gap:8px;font-size:13px}.global-search input,.global-search select{width:100%;min-width:0}.poi-search label:first-child{flex-basis:100%}.global-candidates{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}.global-candidates p{width:100%}.global-candidates button{text-align:left;white-space:normal}.global-grid{display:grid;gap:14px}.global-place:not(:has(.global-photo img)){grid-template-columns:1fr}.transit-legs a{display:block;padding:10px 0;font-size:13px;overflow-wrap:anywhere}.transit-legs h3{font-size:15px}.global-place:not(:has(.global-photo img)){grid-template-columns:1fr}.transit-legs a{display:block;padding:10px 0;font-size:13px;overflow-wrap:anywhere}.transit-legs h3{font-size:15px}.global-place{border:1px solid var(--border);border-radius:14px;overflow:hidden;display:grid;grid-template-columns:125px minmax(0,1fr);padding:14px;gap:16px;scroll-margin-top:20px}.place-copy h3{font-size:17px;margin:7px 0}.place-copy p{font-size:12px;line-height:1.6;color:var(--text-secondary);overflow-wrap:anywhere}.place-copy small{color:var(--primary)}.original-name{margin-top:0}.card-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.card-actions button,.card-actions a{font-size:12px;padding:8px}.selected{border-color:var(--primary)!important;background:var(--primary-soft)}.route-stop{display:flex;gap:12px;padding:20px 12px;border-bottom:1px solid var(--border);overflow-wrap:anywhere}.route-stop h3{font-size:17px;margin:0 0 12px}.route-number{border-radius:50%;background:var(--primary-soft);color:var(--primary);padding:8px 12px;height:36px}.custom-point{padding:16px;background:var(--primary-soft);border-radius:12px;margin-top:16px}.nearby-choice{display:grid;width:100%;text-align:left;margin:8px 0;white-space:normal}.nearby-choice small{font-size:12px;color:var(--text-secondary)}.custom-point label{display:grid;gap:8px;margin:12px 0}.global-attribution{margin-top:28px;font-size:12px;color:var(--text-secondary)}@media(max-width:760px){.global-workspace{grid-template-columns:1fr}.global-map-column{position:static}.global-heading h1{font-size:25px}.global-map-column :deep(.world-map-canvas){height:340px}.global-place{grid-template-columns:95px minmax(0,1fr);gap:12px;padding:12px}.global-heading{align-items:start}.route-overview span{float:none;display:block;margin-top:8px}}
</style>
