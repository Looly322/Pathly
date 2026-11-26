<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { t } from '../i18n';
import { searchDestinations, searchGlobalPlaces } from '../services/globalPlaceService.js';
const props = defineProps({ initialQuery: String, initialDestinations: Array });
const emit = defineEmits(['back', 'domestic']);
const input = ref(props.initialQuery || ''), candidates = ref(props.initialDestinations || []);
const destination = ref(null), places = ref([]), busy = ref(false), error = ref(''), searched = ref(false);
const query = ref(''), category = ref('attractions'), queryUsed = ref('');
let version = 0;
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
  invalidate(); destination.value = city; query.value = ''; category.value = 'attractions';
  await search();
}
async function search() {
  if (!destination.value) return;
  invalidate(); busy.value = true;
  const token = version;
  try {
    const result = await searchGlobalPlaces({ destination: destination.value, query: query.value.trim(), category: query.value.trim() ? '' : category.value });
    if (token !== version) return;
    places.value = result.places; queryUsed.value = result.queryUsed; searched.value = true;
  } catch (e) { if (token === version) error.value = e.message === 'GLOBAL_429' ? 'global.quota' : 'global.failed'; }
  finally { if (token === version) busy.value = false; }
}
function safeWebsite(url) { try { const u = new URL(url); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; } }
onMounted(() => { if (!candidates.value.length && input.value) findCity(); });
onBeforeUnmount(() => ++version);
</script>
<template>
  <main class="global-page">
    <button class="text-button" @click="emit('back')">← {{ t('global.back') }}</button>
    <div class="form-heading"><span class="section-kicker">A WORLD TO DISCOVER</span><h1>{{ t('global.title') }}</h1><p>{{ t('global.intro') }}</p></div>
    <form class="global-search" @submit.prevent="findCity">
      <label>{{ t('global.destination') }}<input v-model="input" @input="cityChanged" :placeholder="t('global.placeholder')" required /></label>
      <button class="primary" :disabled="busy">{{ t('global.findCity') }}</button>
    </form>
    <section v-if="candidates.length" class="global-candidates" :aria-label="t('global.choose')">
      <p>{{ t('global.choose') }}</p>
      <button v-for="city in candidates" :key="city.id" class="outline" :aria-pressed="destination?.id === city.id" @click="choose(city)">
        {{ city.name }} · {{ city.region }} · {{ city.country }} ({{ city.countryCode }})
      </button>
    </section>
    <section v-if="destination" class="global-tools">
      <h2>{{ destination.name }} · {{ destination.country }}</h2>
      <p>{{ destination.latitude }}, {{ destination.longitude }} · {{ destination.countryCode === 'CN' ? 'AMap' : 'Foursquare' }}</p>
      <p>{{ t('global.scope') }}</p>
      <button v-if="destination.countryCode === 'CN'" class="outline" @click="emit('domestic', destination)">{{ t('global.domestic') }}</button>
      <form class="global-search" @submit.prevent="search">
        <label>{{ t('global.poi') }}<input v-model="query" @input="invalidate" :placeholder="t('global.poiPlaceholder')" /></label>
        <label>{{ t('global.category') }}<select v-model="category" @change="query = ''; search()"><option v-for="item in categories" :key="item" :value="item">{{ t('global.categories.' + item) }}</option></select></label>
        <button class="primary" :disabled="busy">{{ t('global.search') }}</button>
      </form>
    </section>
    <p v-if="busy" role="status">{{ t('global.loading') }}</p>
    <p v-if="error" class="global-error" role="alert">{{ t(error) }}</p>
    <p v-if="searched && !places.length">{{ t('global.empty') }}</p>
    <p v-if="searched && queryUsed">{{ t('global.queryUsed') }} {{ queryUsed }}</p>
    <div class="global-grid">
      <article v-for="place in places" :key="place.id" class="global-place">
        <small>{{ place.source === 'amap' ? 'AMap' : 'Foursquare' }}</small><h3>{{ place.name }}</h3>
        <p>{{ place.categories.map(c => c.name).join(' / ') || t('global.unknown') }}</p>
        <p>{{ place.address || t('global.unknown') }}</p>
        <p>{{ place.latitude.toFixed(5) }}, {{ place.longitude.toFixed(5) }}<span v-if="place.distance != null"> · {{ (place.distance / 1000).toFixed(1) }} km</span></p>
        <a v-if="safeWebsite(place.website)" :href="safeWebsite(place.website)" target="_blank" rel="noopener noreferrer">{{ t('global.website') }} ↗</a>
      </article>
    </div>
    <p class="global-attribution">{{ t('global.attribution') }} <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo / GeoNames</a> · <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer">Wikidata</a> · <a href="https://foursquare.com/" target="_blank" rel="noopener noreferrer">Foursquare</a></p>
  </main>
</template>
<style scoped>
.global-page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
.global-search { display:flex; flex-wrap:wrap; gap:16px; align-items:end; margin:24px 0; }
.global-search label { flex:1; min-width:180px; display:grid; gap:8px; }
.global-search input,.global-search select { width:100%; }
.global-candidates { display:flex; flex-wrap:wrap; gap:10px; margin:20px 0; }
.global-candidates p { width:100%; }
.global-candidates button { white-space:normal; text-align:left; }
.global-candidates button[aria-pressed=true] { background:var(--primary-soft); border-color:var(--primary); }
.global-tools { margin:24px 0; padding:24px; border:1px solid var(--border); border-radius:16px; }
.global-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; }
.global-place { border:1px solid var(--border); padding:24px; border-radius:16px; overflow-wrap:anywhere; }
.global-place small,.global-place a { color:var(--primary); }
.global-place p,.global-attribution { color:var(--text-secondary); font-size:14px; line-height:1.7; }
.global-attribution { margin-top:32px; }.global-error { padding:16px; border:1px solid var(--border); }
@media(max-width:800px){.global-grid {grid-template-columns:repeat(2,minmax(0,1fr));}}
@media(max-width:540px){.global-grid {grid-template-columns:1fr;}.global-page{padding:20px 16px;}.global-tools{padding:16px;}.global-search button{width:100%;}}
</style>
