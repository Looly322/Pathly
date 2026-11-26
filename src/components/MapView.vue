<script setup>
import {computed,ref,watch,onBeforeUnmount} from "vue";
import {t,placeName} from "../i18n";
import MapPlanner from "./MapPlanner.vue";
import TransportRoutes from "./TransportRoutes.vue";
import {resolveItineraryPlace,isDemoPlace,} from "../services/itineraryMapService.js";
import {getTransportOptions} from "../services/transportService.js";
const props = defineProps({ stops: Array, active: String, city: String });
const emit = defineEmits(["select"]);
const live = computed(() => props.stops.some((s) => s.place.source === "amap"));
const resolvedCity = ref(null),
  matches = ref([]),
  unmatched = ref([]),
  loading = ref(false),
  fitKey = ref(0),
  legs = ref([]),
  routeLoading = ref(false),
  mode = ref("transit");
const overrides = new Map();
let request = 0,
  routeRequest = 0,
  disposed = false;
const places = computed(() => matches.value.filter(Boolean));
const focusedPlace = computed(
  () => places.value.find((p) => p.id === props.active) || null,
);
const focusKey = ref(0);
watch(
  () => props.active,
  () => {
    focusKey.value++;
  },
);
const paths = computed(() =>
  legs.value
    .flatMap((l) => l.options?.[l.chosen || 0]?.segments || [])
    .filter((s) => s.path.length >= 2),
);
async function resolve() {
  const token = ++request;
  ++routeRequest;
  matches.value = [];
  unmatched.value = [];
  legs.value = [];
  routeLoading.value = false;
  if (!resolvedCity.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  const rows = [];
  const missing = [];
  for (const [i, stop] of props.stops.entries()) {
    if (token !== request || disposed) return;
    let poi = null,
      candidates = [];
    try {
      const known = overrides.get(props.city + ":" + stop.place.id);
      const match = known
        ? { place: known, candidates: [] }
        : await resolveItineraryPlace(
            stop.place,
            props.city,
            resolvedCity.value.adcode,
          );
      poi = match.place;
      candidates = match.candidates;
    } catch {}
    if (token !== request || disposed) return;
    rows.push(poi ? { ...poi, id: stop.place.id, sequence: i + 1 } : null);
    if (!poi)
      missing.push({
        place: stop.place,
        sequence: i + 1,
        demo: isDemoPlace(stop.place),
        candidates,
      });
  }
  matches.value = rows;
  unmatched.value = missing;
  loading.value = false;
  fitKey.value++;
  queryRoutes();
}
async function queryRoutes(refresh = false) {
  const token = ++routeRequest;
  legs.value = [];
  if (loading.value || !resolvedCity.value) {
    routeLoading.value = false;
    return;
  }
  const rows = [...matches.value];
  routeLoading.value = true;
  for (let i = 1; i < rows.length; i++) {
    // 不跨过演示或未匹配站点画连线，避免暗示一条完整可执行路线。
    if (!rows[i - 1] || !rows[i]) continue;
    let result;
    try {
      result = await getTransportOptions(
        rows[i - 1],
        rows[i],
        props.city,
        mode.value,
        refresh,
      );
    } catch {
      result = {
        options: [],
        transitStatus: mode.value === "walking" ? "notRequested" : "error",
      };
    }
    if (token !== routeRequest || disposed) return;
    legs.value.push({ from: rows[i - 1], to: rows[i], ...result, chosen: 0 });
  }
  if (token === routeRequest) {
    routeLoading.value = false;
    fitKey.value++;
  }
}
watch(
  [
    () => props.city,
    () => resolvedCity.value?.adcode,
    () => props.stops.map((s) => s.place.id).join("|"),
  ],
  resolve,
  { immediate: true },
);
watch(mode, () => queryRoutes());
function confirmMatch(id, poi) {
  overrides.set(props.city + ":" + id, poi);
  resolve();
}
function choose(i, j) {
  legs.value[i].chosen = j;
  fitKey.value++;
}
onBeforeUnmount(() => {
  disposed = true;
  ++request;
  ++routeRequest;
});
</script>
<template>
  <div class="result-real-map">
    <MapPlanner
      :selected-city="city"
      :places="places"
      :active="active"
      :focused-place="focusedPlace"
      :focus-key="focusKey"
      :fit-key="fitKey"
      :route-paths="paths"
      read-only
      @city-resolved="resolvedCity = $event"
      @select="emit('select', $event)"
    />
    <section class="result-map-status">
      <strong>{{ t("resultMap.title") }}</strong>
      <p>{{ t(live ? "livePlan.mapNote" : "resultMap.note") }}</p>
      <p v-if="loading" role="status">{{ t("resultMap.loading") }}</p>
      <template v-else-if="resolvedCity">
        <p>
          {{
            t("resultMap.matched", { n: places.length, total: stops.length })
          }}
        </p>
        <ul v-if="unmatched.length">
          <li v-for="item in unmatched" :key="item.place.id">
            {{ item.sequence }}. {{ placeName(item.place) }} —
            {{ t(item.demo ? "resultMap.demo" : "resultMap.unmatched") }}
            <details v-if="item.candidates?.length" class="match-candidates">
              <summary>{{ t("resultMap.choose") }}</summary>
              <button
                v-for="poi in item.candidates"
                :key="poi.id"
                class="outline"
                @click="confirmMatch(item.place.id, poi)"
              >
                <strong>{{ poi.name }}</strong
                ><small>{{ poi.address }}</small>
              </button>
            </details>
          </li>
        </ul>
        <button
          v-if="unmatched.some((p) => !p.demo)"
          class="outline"
          @click="resolve"
        >
          {{ t("resultMap.retry") }}
        </button>
      </template>
      <div class="map-legend">
        <button
          v-for="place in places"
          :key="place.id"
          :class="{ selected: active === place.id }"
          @click="emit('select', place.id)"
        >
          <b>{{ place.sequence }}</b
          >{{ place.name }}
        </button>
      </div>
    </section>
    <TransportRoutes
      v-if="legs.length || routeLoading"
      :legs="legs"
      :loading="routeLoading"
      planned
      :allow-total="!unmatched.length"
      v-model:mode="mode"
      @choose="choose"
      @retry="queryRoutes(true)"
    />
  </div>
</template>
