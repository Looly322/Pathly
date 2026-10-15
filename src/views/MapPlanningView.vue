<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { t } from "../i18n";
import TransportRoutes from "../components/TransportRoutes.vue";
import { getTransportOptions } from "../services/transportService.js";
import MapPlanner from "../components/MapPlanner.vue";
import PlaceSearchPanel from "../components/PlaceSearchPanel.vue";
import SelectedPlacesPanel from "../components/SelectedPlacesPanel.vue";
import CustomPlaceDialog from "../components/CustomPlaceDialog.vue";
import { hasValidCoordinates } from "../utils/geo.js";
import { optimizePlaceOrder } from "../utils/routeOptimizer.js";
const props = defineProps({
  selectedCity: String,
  selectedPlaces: Array,
  wishlist: Array,
});
const emit = defineEmits([
  "update:selectedCity",
  "update:selectedPlaces",
  "back",
]);
const cityInput = ref(props.selectedCity),
  mapStatus = ref("loading"),
  resolvedCity = ref(null),
  active = ref(""),
  focusedPlace = ref(null),
  focusKey = ref(0),
  fitKey = ref(0),
  marking = ref(false),
  draftPoint = ref(null),
  planned = ref(false),
  notice = ref("");
const enabled = computed(
  () => mapStatus.value === "ready" && !!resolvedCity.value,
);
const legs = ref([]),
  routeLoading = ref(false),
  travelMode = ref("transit");
let routeRequest = 0,
  routeTimer;
const routePaths = computed(() =>
  legs.value
    .flatMap((leg) => leg.options?.[leg.chosen || 0]?.segments || [])
    .filter((s) => s.path.length >= 2),
);
async function queryRoutes(refresh = false) {
  const request = ++routeRequest;
  legs.value = [];
  if (
    !planned.value ||
    props.selectedPlaces.length < 2 ||
    !resolvedCity.value
  ) {
    routeLoading.value = false;
    return;
  }
  const places = [...props.selectedPlaces],
    city = props.selectedCity,
    mode = travelMode.value;
  routeLoading.value = true;
  for (let i = 1; i < places.length; i++) {
    if (request !== routeRequest) return;
    let result;
    try {
      result = await getTransportOptions(
        places[i - 1],
        places[i],
        city,
        mode,
        refresh,
      );
    } catch {
      result = {
        options: [],
        transitStatus: mode === "walking" ? "notRequested" : "error",
        walkingStatus: "error",
      };
    }
    if (request !== routeRequest) return;
    legs.value.push({
      from: places[i - 1],
      to: places[i],
      ...result,
      chosen: 0,
    });
  }
  if (request === routeRequest) {
    routeLoading.value = false;
    fitKey.value++;
  }
}
watch(
  () => [
    planned.value,
    travelMode.value,
    resolvedCity.value?.adcode,
    props.selectedPlaces.map((p) => [p.id, p.latitude, p.longitude]),
  ],
  () => {
    ++routeRequest;
    clearTimeout(routeTimer);
    legs.value = [];
    routeLoading.value = planned.value && props.selectedPlaces.length >= 2;
    routeTimer = setTimeout(queryRoutes, 220);
  },
  { deep: true },
);
onBeforeUnmount(() => {
  ++routeRequest;
  clearTimeout(routeTimer);
});
function chooseRoute(i, j) {
  legs.value[i].chosen = j;
  fitKey.value++;
}
watch(
  () => props.selectedCity,
  (city) => {
    cityInput.value = city;
    resolvedCity.value = null;
    marking.value = false;
    draftPoint.value = null;
    active.value = "";
    focusedPlace.value = null;
    focusKey.value++;
    planned.value = false;
    notice.value = "";
  },
);
function confirmCity() {
  const city = cityInput.value.trim();
  if (!city) {
    notice.value = "map.cityRequired";
    return;
  }
  if (city !== props.selectedCity) emit("update:selectedCity", city);
  notice.value = "";
}
function focus(place) {
  active.value = place.id;
  focusedPlace.value = place;
  focusKey.value++;
}
function markerSelected(id) {
  active.value = id;
  focusedPlace.value =
    props.selectedPlaces.find((p) => p.id === id) || focusedPlace.value;
  document
    .getElementById("selected-" + id)
    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function add(place) {
  if (!hasValidCoordinates(place)) {
    notice.value = "map.invalidCoordinates";
    return;
  }
  if (!enabled.value) return;
  if (!props.selectedPlaces.some((p) => p.id === place.id))
    emit("update:selectedPlaces", [
      ...props.selectedPlaces,
      { ...place, city: props.selectedCity },
    ]);
  focus(place);
  notice.value = "";
}
function remove(id) {
  const place = props.selectedPlaces.find((p) => p.id === id);
  if (place?.locked) return;
  emit(
    "update:selectedPlaces",
    props.selectedPlaces.filter((p) => p.id !== id),
  );
  if (focusedPlace.value?.id === id) {
    focusedPlace.value = null;
    focusKey.value++;
  }
  if (active.value === id) active.value = "";
  notice.value = "";
}
function lock(id) {
  emit(
    "update:selectedPlaces",
    props.selectedPlaces.map((p) =>
      p.id === id ? { ...p, locked: !p.locked } : p,
    ),
  );
}
function move(index, delta) {
  const next = [...props.selectedPlaces],
    target = index + delta;
  if (target < 0 || target >= next.length) return;
  [next[index], next[target]] = [next[target], next[index]];
  emit("update:selectedPlaces", next);
  notice.value = "";
}
function plan() {
  if (props.selectedPlaces.length < 2) {
    notice.value = "map.needTwo";
    return;
  }
  try {
    emit("update:selectedPlaces", optimizePlaceOrder(props.selectedPlaces));
    planned.value = true;
    notice.value = "";
    fitKey.value++;
    focusedPlace.value = null;
    focusKey.value++;
  } catch {
    notice.value = "map.invalidCoordinates";
  }
}
function setMark(value = false) {
  marking.value = value === true;
  draftPoint.value = null;
}
function customPoint(point) {
  draftPoint.value = point;
  marking.value = false;
}
function saveCustom(place) {
  add(place);
  draftPoint.value = null;
  marking.value = false;
}
</script>
<template>
  <main class="map-planning-page">
    <div class="map-page-heading">
      <div>
        <button class="back-link" @click="$emit('back')">
          ← {{ t("map.back") }}
        </button>
        <h1>{{ t("map.title") }}</h1>
        <p>{{ t("map.intro") }}</p>
      </div>
      <span class="pill"
        >{{ t("map.mode") }} · {{ t("commute.routeLabel") }}</span
      >
    </div>
    <form class="map-city-form" @submit.prevent="confirmCity">
      <label class="field"
        >{{ t("city")
        }}<input
          v-model="cityInput"
          :placeholder="t('placeholder')"
          maxlength="60"
          required /></label
      ><button class="primary">{{ t("map.cityConfirm") }}</button>
      <p>{{ t("map.citySwitchHint") }}</p>
    </form>
    <div class="map-planning-layout">
      <div class="map-workspace">
        <MapPlanner
          :selected-city="selectedCity"
          :places="selectedPlaces"
          :active="active"
          :focused-place="focusedPlace"
          :focus-key="focusKey"
          :fit-key="fitKey"
          :marking="marking"
          :draft-point="draftPoint"
          :show-route="false"
          :route-paths="routePaths"
          @status="mapStatus = $event"
          @city-resolved="resolvedCity = $event"
          @select="markerSelected"
          @add="add"
          @map-point="customPoint"
          @cancel-mark="setMark"
        />
        <TransportRoutes
          :legs="legs"
          :loading="routeLoading"
          :planned="planned"
          v-model:mode="travelMode"
          @choose="chooseRoute"
          @retry="queryRoutes(true)"
        />
      </div>
      <aside class="map-selection-sidebar">
        <PlaceSearchPanel
          :city="selectedCity"
          :city-code="resolvedCity?.adcode"
          :enabled="enabled"
          :selected-places="selectedPlaces"
          :wishlist="wishlist"
          @view="focus"
          @add="add"
        /><SelectedPlacesPanel
          :places="selectedPlaces"
          :active="active"
          @select="focus"
          @remove="remove"
          @lock="lock"
          @move="move"
          @plan="plan"
        />
        <p
          v-if="notice"
          class="notice"
          :role="notice === 'map.planned' ? 'status' : 'alert'"
        >
          {{ t(notice) }}
        </p>
      </aside>
    </div>
    <CustomPlaceDialog
      v-if="draftPoint"
      :point="draftPoint"
      :city="selectedCity"
      @close="
        draftPoint = null;
        marking = false;
      "
      @save="saveCustom"
    />
  </main>
</template>
