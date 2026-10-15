<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { t, language } from "../i18n";
import { theme, customColor } from "../utils/theme.js";
import {
  isAmapConfigured,
  loadAmap,
  withTimeout,
} from "../services/amapService.js";
import { identifyMapPoint } from "../services/placeService.js";
import { resolveMapCity } from "../services/cityService.js";
import { hasValidCoordinates } from "../utils/geo.js";
const props = defineProps({
  selectedCity: String,
  places: Array,
  active: String,
  focusedPlace: Object,
  focusKey: Number,
  fitKey: Number,
  marking: Boolean,
  draftPoint: Object,
  showRoute: Boolean,
  readOnly: Boolean,
  allowCustom: {type:Boolean,default:true},
  routePaths: { type: Array, default: () => [] },
});
const emit = defineEmits([
  "status",
  "city-resolved",
  "select",
  "add",
  "map-point",
  "cancel-mark",
]);
const container = ref(null),
  status = ref("loading"),
  cityState = ref("idle"),
  resolvedName = ref(""),
  popupPlace = ref(null);
const lookup = ref(null),
  lookupLoading = ref(false),
  lookupError = ref(false);
let clickTimer,
  lookupRequest = 0,
  lastHotspotAt = 0;
const routeLines = [];
// SDK 对象保持普通变量，避免 Vue 代理破坏第三方实例的内部状态。
let AMap, map, previewMarker, draftMarker, resizeObserver, resizeTimer;
const markers = new Map();
let disposed = false,
  initializing = false,
  cityRequest = 0,
  lifecycle = 0,
  suppressClickUntil = 0;
const primary = () =>
  getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();
function setStatus(value) {
  status.value = value;
  emit("status", value);
}
function createContent(place, number) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `pathly-map-marker${place.source === "custom" ? " custom-marker" : ""}${props.active === place.id ? " is-active" : ""}`;
  el.textContent = String(number);
  const label = document.createElement("span");
  label.className = "marker-place-name";
  label.textContent = place.name;
  el.append(label);
  el.title = place.name;
  el.setAttribute("aria-label", `${number}. ${place.name}`);
  // DOM 按钮直接处理点击，避免 SDK 覆盖物在路线更新时吞掉点击事件。
  el.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    focusPlace(place);
    emit("select", place.id);
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      focusPlace(place);
      emit("select", place.id);
    }
  });
  return el;
}
function createMarker(place, number) {
  const marker = new AMap.Marker({
    position: [place.longitude, place.latitude],
    content: createContent(place, number),
    anchor: "center",
    bubble: false,
    zIndex: props.active === place.id ? 150 : 110,
  });
  marker.on("click", () => {
    focusPlace(place);
    emit("select", place.id);
  });
  marker.setMap(map);
  return marker;
}
function removeMarker(marker) {
  if (marker) marker.setMap(null);
}
function syncOverlays() {
  if (!map || status.value !== "ready") return;
  const valid = props.places.filter(hasValidCoordinates),
    ids = new Set(valid.map((p) => p.id));
  if (props.readOnly && popupPlace.value && !ids.has(popupPlace.value.id))
    popupPlace.value = null;
  for (const [id, marker] of markers) {
    if (!ids.has(id)) {
      removeMarker(marker);
      markers.delete(id);
    }
  }
  valid.forEach((place, i) => {
    if (!markers.has(place.id))
      markers.set(place.id, createMarker(place, place.sequence || i + 1));
    const marker = markers.get(place.id);
    marker.setContent(createContent(place, place.sequence || i + 1));
    marker.setPosition([place.longitude, place.latitude]);
    marker.setzIndex(props.active === place.id ? 150 : 110);
  });
  for (const line of routeLines) line.setMap(null);
  routeLines.length = 0;
  for (const segment of props.routePaths) {
    const line = new AMap.Polyline({
      path: segment.path,
      strokeColor: primary(),
      strokeWeight: segment.mode === "walk" ? 4 : 6,
      strokeOpacity: 0.85,
      strokeStyle: segment.mode === "walk" ? "dashed" : "solid",
      lineJoin: "round",
      showDir: segment.mode !== "walk",
      zIndex: 60,
      bubble: false,
    });
    line.setMap(map);
    routeLines.push(line);
  }
  removeMarker(previewMarker);
  previewMarker = null;
  if (
    popupPlace.value &&
    hasValidCoordinates(popupPlace.value) &&
    !ids.has(popupPlace.value.id)
  )
    previewMarker = createMarker(popupPlace.value, "＋");
  removeMarker(draftMarker);
  draftMarker = null;
  if (props.draftPoint && hasValidCoordinates(props.draftPoint)) {
    const content = document.createElement("span");
    content.className = "pathly-map-marker custom-marker";
    content.textContent = "＋";
    draftMarker = new AMap.Marker({
      position: [props.draftPoint.longitude, props.draftPoint.latitude],
      content,
      anchor: "center",
      bubble: false,
    });
    draftMarker.setMap(map);
  }
}
function focusPlace(place) {
  if (!map || status.value !== "ready" || !hasValidCoordinates(place)) return;
  ++lookupRequest;
  lookup.value = null;
  lookupLoading.value = false;
  lookupError.value = false;
  popupPlace.value = place;
  map.setZoomAndCenter(16, [place.longitude, place.latitude], true);
  syncOverlays();
}
function closePreview() {
  popupPlace.value = null;
  syncOverlays();
}
function fitView() {
  if (!map || status.value !== "ready") return;
  const overlays = [...markers.values(), ...routeLines];
  if (overlays.length) map.setFitView(overlays, true, [70, 55, 70, 55], 16);
}
async function locateCity() {
  const request = ++cityRequest;
  cancelLookup();
  resolvedName.value = "";
  cityState.value = props.selectedCity ? "loading" : "idle";
  emit("city-resolved", null);
  popupPlace.value = null;
  syncOverlays();
  if (!map || status.value !== "ready") return;
  if (!props.selectedCity) {
    map.setZoomAndCenter(4, [104, 35], true);
    return;
  }
  try {
    const result = await resolveMapCity(props.selectedCity);
    if (disposed || request !== cityRequest) return;
    cityState.value = "ready";
    resolvedName.value = result.name;
    map.setZoomAndCenter(12, [result.longitude, result.latitude], true);
    emit("city-resolved", result);
  } catch {
    if (!disposed && request === cityRequest) cityState.value = "error";
  }
}
function cancelLookup() {
  ++lookupRequest;
  clearTimeout(clickTimer);
  lookup.value = null;
  lookupLoading.value = false;
  lookupError.value = false;
}
async function identify(point, hotspot = null) {
  if (cityState.value !== "ready" || !hasValidCoordinates(point)) return;
  const request = ++lookupRequest;
  lookupLoading.value = true;
  lookupError.value = false;
  lookup.value = null;
  popupPlace.value = null;
  syncOverlays();
  try {
    const found = await identifyMapPoint(point, props.selectedCity, hotspot);
    if (disposed || request !== lookupRequest) return;
    if (found.place) focusPlace(found.place);
    else lookup.value = { ...found, point };
  } catch {
    if (!disposed && request === lookupRequest) {
      lookupError.value = true;
      lookup.value = { point, candidates: [], address: "" };
    }
  } finally {
    if (request === lookupRequest) lookupLoading.value = false;
  }
}
function mapClick(event) {
  if (props.readOnly) return;
  if (
    props.draftPoint ||
    cityState.value !== "ready" ||
    Date.now() < suppressClickUntil ||
    Date.now() - lastHotspotAt < 250
  )
    return;
  const point = {
    longitude: event.lnglat.getLng(),
    latitude: event.lnglat.getLat(),
  };
  if (!hasValidCoordinates(point)) return;
  if (props.marking) {
    cancelLookup();
    emit("map-point", point);
    return;
  }
  // 底图热点和普通 click 可能同时触发，稍延迟普通识别，让精确 POI 优先。
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => identify(point), 150);
}
function hotspotClick(event) {
  if (props.readOnly) return;
  if (props.marking || props.draftPoint || cityState.value !== "ready") return;
  clearTimeout(clickTimer);
  lastHotspotAt = Date.now();
  const location = event.lnglat || event.location;
  const point = {
    longitude: location?.getLng?.() ?? location?.lng,
    latitude: location?.getLat?.() ?? location?.lat,
  };
  identify(point, event);
}
function manualPoint() {
  const point = lookup.value?.point;
  cancelLookup();
  if (point) emit("map-point", point);
}
function destroyMap() {
  for (const marker of markers.values()) removeMarker(marker);
  markers.clear();
  for (const line of routeLines) line.setMap(null);
  routeLines.length = 0;
  map?.destroy();
  map = null;
  previewMarker = null;
  draftMarker = null;
}
async function initialize() {
  if (initializing || disposed) return;
  if (!isAmapConfigured()) {
    setStatus("unconfigured");
    return;
  }
  initializing = true;
  const generation = ++lifecycle;
  setStatus("loading");
  try {
    AMap = await loadAmap();
    if (disposed || generation !== lifecycle) return;
    await nextTick();
    destroyMap();
    map = new AMap.Map(container.value, {
      viewMode: "2D",
      isHotspot: true,
      zoom: 4,
      center: [104, 35],
      zooms: [3, 20],
      resizeEnable: true,
      dragEnable: true,
      zoomEnable: true,
      scrollWheel: true,
      doubleClickZoom: true,
    });
    map.addControl(new AMap.Scale());
    map.addControl(new AMap.ToolBar({ position: "RB" }));
    map.on("click", mapClick);
    map.on("hotspotclick", hotspotClick);
    map.on("dragstart", () => (suppressClickUntil = Infinity));
    map.on("dragend", () => (suppressClickUntil = Date.now() + 200));
    await withTimeout(
      new Promise((resolve) => map.on("complete", resolve)),
      "AMAP_LOAD_FAILED",
    );
    if (disposed || generation !== lifecycle) return;
    setStatus("ready");
    syncOverlays();
    await locateCity();
  } catch {
    if (!disposed && generation === lifecycle) {
      destroyMap();
      setStatus("error");
      emit("city-resolved", null);
    }
  } finally {
    initializing = false;
  }
}
watch(
  () => props.selectedCity,
  () => {
    emit("cancel-mark");
    locateCity();
  },
);
watch(
  () => [props.places, props.active, props.draftPoint, props.routePaths],
  syncOverlays,
  { deep: true },
);
watch(
  () => props.focusKey,
  () => {
    if (props.focusedPlace) focusPlace(props.focusedPlace);
    else closePreview();
  },
);
watch(() => props.fitKey, fitView);
watch([theme, customColor, language], syncOverlays);
watch(
  () => props.marking,
  (value) => map?.setDefaultCursor(value ? "crosshair" : "grab"),
);
onMounted(() => {
  initialize();
  // 容器在桌面 / 手机布局之间改变尺寸时重新适配已选点，避免标记落在视野外。
  resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!disposed && status.value === "ready") {
        map.resize();
        if (markers.size) fitView();
      }
    }, 120);
  });
  resizeObserver.observe(container.value);
});
onBeforeUnmount(() => {
  disposed = true;
  cancelLookup();
  lifecycle++;
  cityRequest++;
  resizeObserver?.disconnect();
  clearTimeout(resizeTimer);
  destroyMap();
});
</script>
<template>
  <section class="real-map-card" :aria-label="t('map.title')">
    <div class="real-map-toolbar">
      <div>
        <span class="section-kicker">{{ t("map.mode") }}</span>
        <h2>{{ selectedCity || t("map.noCity") }}</h2>
      </div>
      <div>
        <button
          class="outline"
          :disabled="status !== 'ready' || cityState !== 'ready'"
          v-if="!readOnly && allowCustom"
          :class="{ selected: marking }"
          @click="$emit('cancel-mark', !marking)"
        >
          {{ t(marking ? "map.cancelMark" : "map.custom") }}</button
        ><button
          class="outline fit-map"
          :disabled="status !== 'ready' || !places.length"
          @click="fitView"
        >
          {{ t("map.fit") }}
        </button>
      </div>
    </div>
    <p class="map-click-hint">
      {{ t(readOnly ? "resultMap.interaction" : "commute.clickHint") }}
    </p>
    <div class="real-map-frame">
      <div
        ref="container"
        class="amap-container"
        :aria-label="t('map.title')"
      />
      <div
        v-if="status !== 'ready'"
        class="map-status"
        :role="status === 'error' ? 'alert' : 'status'"
      >
        <span class="map-status-symbol">⌖</span
        ><strong>{{
          t(
            status === "unconfigured"
              ? "map.unconfigured"
              : status === "error"
                ? "map.loadError"
                : "map.loading",
          )
        }}</strong>
        <p v-if="status === 'unconfigured'">{{ t("map.configureHint") }}</p>
        <button v-if="status === 'error'" class="primary" @click="initialize">
          {{ t("map.retry") }}
        </button>
      </div>
      <div
        v-if="status === 'ready' && cityState === 'loading'"
        class="map-city-status"
        role="status"
      >
        {{ t("map.cityLoading") }}
      </div>
      <div
        v-if="status === 'ready' && cityState === 'error'"
        class="map-city-status error"
        role="alert"
      >
        {{ t("map.cityError") }}
        <button @click="locateCity">{{ t("map.cityConfirm") }}</button>
      </div>
      <div
        v-if="marking && status === 'ready'"
        class="marking-hint"
        role="status"
      >
        {{ t("map.markHint") }}
      </div>
      <div v-if="lookupLoading" class="map-city-status" role="status">
        {{ t("commute.identifying") }}
      </div>
      <div v-if="lookup && !marking" class="map-place-popup point-lookup">
        <button
          class="popup-close"
          :aria-label="t('commute.close')"
          @click="cancelLookup"
        >
          ×
        </button>
        <h3>
          {{
            t(
              lookupError
                ? "commute.lookupError"
                : lookup.candidates.length
                  ? "commute.nearby"
                  : "commute.noNearby",
            )
          }}
        </h3>
        <p>{{ lookup.address }}</p>
        <button
          v-for="place in lookup.candidates"
          :key="place.id"
          class="nearby-place"
          @click="focusPlace(place)"
        >
          <strong>{{ place.name }}</strong
          ><small v-if="place.distance != null">{{
            t("commute.near", { n: Math.round(place.distance) })
          }}</small></button
        ><button v-if="allowCustom" class="outline" @click="manualPoint">
          {{ t("commute.manual") }}
        </button>
      </div>
      <div
        v-if="popupPlace && status === 'ready' && !marking"
        class="map-place-popup"
      >
        <button
          class="popup-close"
          :aria-label="t('map.closePreview')"
          @click="closePreview"
        >
          ×</button
        ><small>{{ t("map.preview") }}</small>
        <h3>{{ popupPlace.name }}</h3>
        <p>{{ popupPlace.address || t("map.addressUnknown") }}</p>
        <button
          class="primary"
          v-if="!readOnly && allowCustom"
          :disabled="places.some((p) => p.id === popupPlace.id)"
          @click="$emit('add', popupPlace)"
        >
          {{
            t(
              places.some((p) => p.id === popupPlace.id)
                ? "map.added"
                : "map.add",
            )
          }}
        </button>
      </div>
    </div>
    <div class="real-map-caption">
      <span><i class="tiny-dot" /> {{ t(routePaths.length ? "commute.routeLabel" : "global.mapTitle") }}</span
      ><span v-if="cityState === 'ready'">{{
        t("map.cityResolved", { city: resolvedName })
      }}</span>
    </div>
  </section>
</template>
