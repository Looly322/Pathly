<script setup>
import {computed} from "vue";
import {t} from "../i18n";
const props = defineProps({
  legs: Array,
  loading: Boolean,
  planned: Boolean,
  mode: String,
  allowTotal: { type: Boolean, default: true },
});
const emit = defineEmits(["update:mode", "choose", "retry"]);
const chosen = computed(() =>
  props.legs.map((l) => l.options?.[l.chosen || 0]),
);
const complete = computed(
  () =>
    props.allowTotal &&
    props.planned &&
    !props.loading &&
    props.legs.length &&
    chosen.value.every(Boolean),
);
const total = computed(() =>
  chosen.value.reduce((n, r) => n + (r?.seconds || 0), 0),
);
const distance = computed(() =>
  chosen.value.reduce((n, r) => n + (r?.meters || 0), 0),
);
</script>
<template>
  <section class="route-summary transport-routes">
    <div class="route-summary-heading">
      <h2>{{ t("commute.title") }}</h2>
      <button
        v-if="planned && !loading"
        class="back-link"
        @click="emit('retry')"
      >
        ↻ {{ t("commute.retry") }}
      </button>
    </div>
    <div class="transport-modes" :aria-label="t('commute.mode')">
      <button
        v-for="value in ['transit', 'bus', 'walking']"
        :key="value"
        class="chip"
        :class="{ selected: mode === value }"
        :aria-pressed="mode === value"
        @click="emit('update:mode', value)"
      >
        {{ t("commute." + value) }}
      </button>
    </div>
    <p v-if="!planned">{{ t("commute.planFirst") }}</p>
    <p v-if="loading" role="status">{{ t("commute.loading") }}</p>
    <div v-if="complete" class="route-summary-data">
      <div>
        <small>{{ t("commute.total") }}</small
        ><strong
          >{{ Math.ceil(total / 60) }} <span>{{ t("minutes") }}</span></strong
        >
      </div>
      <div>
        <small>{{ t("commute.distance") }}</small
        ><strong>{{ (distance / 1000).toFixed(2) }} <span>km</span></strong>
      </div>
    </div>
    <p v-if="planned && !loading && !complete" role="alert">
      {{ t(allowTotal ? "commute.partial" : "resultMap.partial") }}
    </p>
    <article
      v-for="(leg, i) in legs"
      :key="leg.from.id + '-' + leg.to.id"
      class="transport-leg"
    >
      <h3>{{ i + 1 }}. {{ leg.from.name }} → {{ leg.to.name }}</h3>
      <p
        v-if="leg.transitStatus === 'error' || leg.transitStatus === 'empty'"
        class="transport-notice"
      >
        {{
          t(
            leg.transitStatus === "error"
              ? "commute.transitError"
              : "commute.transitEmpty",
          )
        }}
      </p>
      <p v-if="!leg.options?.length && !loading">{{ t("commute.empty") }}</p>
      <div class="transport-options">
        <button
          v-for="(option, j) in leg.options"
          :key="option.id"
          class="chip"
          :class="{ selected: j === (leg.chosen || 0) }"
          :aria-pressed="j === (leg.chosen || 0)"
          @click="emit('choose', i, j)"
        >
          <strong
            >{{
              option.mode === "walking"
                ? t("commute.walking")
                : t("commute.option", { n: j + 1 })
            }}
            ·
            {{
              t("commute.minutes", { n: Math.ceil(option.seconds / 60) })
            }}</strong
          ><small>{{
            option.mode === "walking"
              ? t("commute.walkDistance", { n: Math.round(option.meters) })
              : option.segments
                  .filter((s) => s.mode !== "walk")
                  .map((s) => s.line || t("commute." + s.mode))
                  .join(" → ")
          }}</small>
        </button>
      </div>
      <template v-if="chosen[i]"
        ><div class="transport-meta">
          <span>{{ (chosen[i].meters / 1000).toFixed(2) }} km</span
          ><span v-if="chosen[i].walkingMeters != null">{{
            t("commute.walkDistance", {
              n: Math.round(chosen[i].walkingMeters),
            })
          }}</span
          ><span v-if="chosen[i].mode !== 'walking'">{{
            t("commute.transfers", { n: chosen[i].transfers })
          }}</span
          ><span v-if="chosen[i].cost != null">{{
            t("commute.fare", { n: chosen[i].cost })
          }}</span>
        </div>
        <ol class="transport-segments">
          <li v-for="(segment, k) in chosen[i].segments" :key="k">
            <span class="segment-mode">{{
              t(
                "commute." +
                  (segment.mode === "bus" ? "busLabel" : segment.mode),
              )
            }}</span>
            <div>
              <strong>{{
                segment.line ||
                (segment.mode === "walk"
                  ? t("commute.walkDistance", { n: segment.meters ?? 0 })
                  : segment.instruction)
              }}</strong>
              <p v-if="segment.from || segment.to">
                {{ segment.from }} → {{ segment.to }}
              </p>
              <small v-if="segment.seconds != null">{{
                t("commute.minutes", { n: Math.ceil(segment.seconds / 60) })
              }}</small>
              <p v-if="segment.entrance || segment.exit">
                {{
                  segment.entrance
                    ? t("commute.entrance") + " " + segment.entrance
                    : ""
                }}
                {{ segment.exit ? t("commute.exit") + " " + segment.exit : "" }}
              </p>
              <details v-if="segment.steps?.length">
                <summary>{{ t("commute.details") }}</summary>
                <p v-for="(step, n) in segment.steps" :key="n">{{ step }}</p>
              </details>
            </div>
          </li>
        </ol></template
      >
    </article>
    <p>{{ t("commute.hint") }}</p>
    <small>{{ t("commute.lineHint") }}</small>
  </section>
</template>
