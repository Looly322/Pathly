<script setup>
import {computed,ref} from "vue";
import {t} from "../i18n";
import {isAttraction} from "../utils/regionPlanning.js";
import {generatePlanVariants,replacePlace} from "../utils/recommendation";
import {schedule} from "../utils/itinerary";
import {evaluateStability} from "../utils/stability";
import MapView from "../components/MapView.vue";
import StabilityCard from "../components/StabilityCard.vue";
import PlanStyleTabs from "../components/PlanStyleTabs.vue";
import ItineraryTimeline from "../components/ItineraryTimeline.vue";
import PlanComparison from "../components/PlanComparison.vue";
import PlaceDetailDialog from "../components/PlaceDetailDialog.vue";
const props = defineProps({
  settings: Object,
  places: Array,
  supported: Boolean,
  pending: Array,
});
defineEmits(["back"]);
const variants = ref(generatePlanVariants(props.places, props.settings)),
  selected = ref("explorer"),
  active = ref(""),
  detail = ref(null),
  comparison = ref(false),
  history = ref([]),
  notice = ref("");
const current = computed(() =>
  variants.value.find((p) => p.id === selected.value),
);
const itinerary = computed(() =>
  schedule(current.value.items, props.settings, current.value.buffer),
);
const stability = computed(() =>
  evaluateStability(itinerary.value, props.settings),
);
const comparisons = computed(() =>
  variants.value.map((p) => {
    const data = schedule(p.items, props.settings, p.buffer);
    return {
      ...data,
      id: p.id,
      count: p.items.length,
      attractions: p.items.filter((s) => isAttraction(s.place)).length,
      averageStay: p.items.length
        ? Math.round(
            p.items.reduce((n, s) => n + s.duration, 0) / p.items.length,
          )
        : 0,
      stability: evaluateStability(data, props.settings).score,
    };
  }),
);
function snapshot() {
  history.value.push(JSON.stringify(variants.value));
  if (history.value.length > 30) history.value.shift();
  notice.value = "";
}
function undo() {
  if (history.value.length) variants.value = JSON.parse(history.value.pop());
  notice.value = "";
}
function syncLocks() {
  const locks = current.value.items.filter((s) => s.locked);
  // 锁定是所有方案共享的保留约束；切换方案也不会丢失。
  for (const plan of variants.value) {
    if (plan.id === selected.value) continue;
    for (const lock of locks) {
      const idx = plan.items.findIndex((s) => s.place.id === lock.place.id);
      if (idx < 0) plan.items.push({ ...lock });
      else plan.items[idx] = { ...lock };
    }
  }
}
function edit(action, index, delta) {
  const items = current.value.items,
    stop = items[index];
  if (stop.locked && ["replace", "remove"].includes(action)) return;
  if (action === "replace") {
    const candidates = replacePlace(stop.place, props.places, {
      ...props.settings,
      style: selected.value,
      excludedIds: items.map((s) => s.place.id),
    });
    const replacement = candidates.find((p) => {
      const test = items.map((s, i) =>
        i === index ? { ...s, place: p, duration: p.estimatedStay } : s,
      );
      const checked = schedule(test, props.settings, current.value.buffer);
      return !checked.overflow && checked.cost <= props.settings.budget;
    });
    if (!replacement) {
      notice.value = "noReplacement";
      return;
    }
    snapshot();
    items[index] = {
      ...stop,
      place: replacement,
      duration: replacement.estimatedStay,
    };
    active.value = replacement.id;
    return;
  }
  snapshot();
  if (action === "duration")
    stop.duration = Math.max(15, stop.duration + delta);
  if (action === "delay")
    stop.delay = Math.max(
      index === 0 ? 0 : -current.value.buffer,
      (stop.delay || 0) + delta,
    );
  if (action === "move" && index + delta >= 0 && index + delta < items.length)
    [items[index], items[index + delta]] = [items[index + delta], items[index]];
  if (action === "remove") {
    items.splice(index, 1);
    if (active.value === stop.place.id) active.value = "";
  }
  if (action === "lock") {
    stop.locked = !stop.locked;
    if (!stop.locked)
      for (const plan of variants.value) {
        const found = plan.items.find((s) => s.place.id === stop.place.id);
        if (found) found.locked = false;
      }
  }
  syncLocks();
}
function regenerate() {
  snapshot();
  const locks = current.value.items.filter((s) => s.locked);
  variants.value = generatePlanVariants(props.places, props.settings, locks);
}
function compress() {
  snapshot();
  let guard = 0;
  while (itinerary.value.overflow && guard++ < 1000) {
    const candidates = current.value.items.filter(
      (s) => !s.locked && (s.duration > 30 || s.delay > 0),
    );
    if (!candidates.length) break;
    const s = candidates.sort(
      (a, b) => b.duration + b.delay - (a.duration + a.delay),
    )[0];
    if (s.delay > 0) s.delay = Math.max(0, s.delay - 15);
    else
      s.duration = Math.max(
        30,
        s.duration - Math.min(15, itinerary.value.overflow),
      );
  }
  syncLocks();
}
function selectMarker(id) {
  active.value = id;
  document
    .getElementById("stop-" + id)
    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
</script>
<template>
  <main class="result-page">
    <div class="result-heading">
      <div>
        <button class="back-link" @click="$emit('back')">
          ← {{ t("back") }}
        </button>
        <h1>
          {{ settings.selectedCity }} <span>· {{ t("trip") }}</span>
        </h1>
        <p>
          {{ settings.date }} <span> / </span> {{ settings.start }} —
          {{ settings.end }} <span> / </span> {{ t("planHint") }}
        </p>
      </div>
      <div class="result-buttons">
        <button class="outline" @click="comparison = true">
          ⇄ {{ t("compare") }}</button
        ><button class="primary" @click="regenerate">
          ↻ {{ t("regenerate") }}
        </button>
      </div>
    </div>
    <div v-if="!supported" class="notice">
      <strong>{{ t("demo") }} · {{ t("unsupported") }}</strong>
      <p>{{ t("unsupportedDetail") }}</p>
    </div>
    <div v-if="pending.length" class="notice subtle">
      {{ t("pendingNote") }} {{ pending.join("、") }}
    </div>
    <div v-if="settings.live" class="notice live-plan-note">
      <strong>{{ t("livePlan.notice") }}</strong>
      <p>{{ t("livePlan.estimates") }}</p>
      <p v-if="settings.discoveryWarnings?.length">
        {{ t("livePlan.partial") }}
      </p>
    </div>
    <PlanStyleTabs v-model="selected" :plans="comparisons" />
    <section class="style-explanation" aria-live="polite">
      <strong>{{
        t(
          settings.live && selected === "crowd"
            ? "livePlan.crowdLimited"
            : "styleLogic." + selected,
        )
      }}</strong>
      <p>
        {{
          t("styleLogic.region", {
            kind: t("styleLogic." + current.region.kind),
            stay: current.region.typicalStay,
            distance: current.region.nearestKm,
          })
        }}
      </p>
      <p>
        {{
          t("styleLogic.actual", {
            count: current.items.length,
            attractions: current.items.filter((s) => isAttraction(s.place))
              .length,
            buffer: current.buffer,
            crowd: itinerary.crowding ?? t("livePlan.unknown"),
          })
        }}
      </p>
      <small>{{ t("styleLogic.source") }}</small>
      <p
        v-if="
          selected === 'slow' &&
          current.items.length >= variants[0].items.length
        "
        class="style-constraint"
      >
        {{ t("styleLogic.constrained") }}
      </p>
    </section>
    <div class="metrics">
      <div>
        <small>{{ t("count") }}</small
        ><strong
          >{{ itinerary.stops.length }}<span>{{ t("places") }}</span></strong
        >
      </div>
      <div>
        <small>{{ t("cost") }}</small
        ><strong
          >¥{{ itinerary.cost }}<span>/ ¥{{ settings.budget }}</span></strong
        >
      </div>
      <div>
        <small>{{ t("distance") }}</small
        ><strong>{{ itinerary.distance }}<span>km</span></strong>
      </div>
      <div>
        <small>{{ t("free") }}</small
        ><strong
          >{{ itinerary.free }}<span>{{ t("minutes") }}</span></strong
        >
      </div>
      <div>
        <small>{{ t("stability") }}</small
        ><strong>{{ stability.score }}<span>/ 100</span></strong>
      </div>
    </div>
    <div v-if="itinerary.overflow" class="notice warning" role="alert">
      <strong>{{ t("overflow", { n: itinerary.overflow }) }}</strong>
      <div>
        <button @click="compress">{{ t("compress") }}</button
        ><button :disabled="!history.length" @click="undo">
          {{ t("undo") }}
        </button>
      </div>
    </div>
    <div
      v-if="itinerary.cost > settings.budget"
      class="notice warning"
      role="alert"
    >
      {{ t("overBudget", { n: itinerary.cost - settings.budget }) }}
    </div>
    <div v-if="notice" class="notice" role="status">{{ t(notice) }}</div>
    <div class="result-layout">
      <div class="map-column">
        <MapView
          :stops="itinerary.stops"
          :city="settings.selectedCity"
          :active="active"
          @select="selectMarker"
        /><StabilityCard :value="stability" />
        <p class="map-disclaimer">
          {{ t(settings.live ? "livePlan.estimates" : "mockDescription") }}
        </p>
      </div>
      <section class="itinerary-column">
        <div class="itinerary-heading">
          <h2>
            {{ t("today")
            }}<span>{{
              itinerary.stops.length.toString().padStart(2, "0")
            }}</span>
          </h2>
          <button class="back-link" :disabled="!history.length" @click="undo">
            ↶ {{ t("undo") }}
          </button>
        </div>
        <p class="locked-help">{{ t("lockedNote") }}</p>
        <div v-if="!itinerary.stops.length" class="empty-state">
          {{ t("empty") }}
        </div>
        <ItineraryTimeline
          :stops="itinerary.stops"
          :active="active"
          :settings="settings"
          :buffer="current.buffer"
          @select="active = $event"
          @detail="detail = $event"
          @edit="edit"
        />
        <div class="timeline-end">
          <span>⚑</span>{{ settings.end }} · {{ t("footer") }}
        </div>
      </section>
    </div>
    <PlanComparison
      v-if="comparison"
      :plans="comparisons"
      @close="comparison = false"
    /><PlaceDetailDialog
      v-if="detail"
      :stop="detail"
      :settings="settings"
      @close="detail = null"
    />
  </main>
</template>
