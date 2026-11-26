<script setup>
import {t,placeName} from "../i18n";
import {recommendationReasons} from "../utils/recommendation";
import ModalShell from "./ModalShell.vue";
import PlaceImage from "./PlaceImage.vue";
import TouristReviews from "./TouristReviews.vue";
import CrowdBadge from "./CrowdBadge.vue";
defineProps({ stop: Object, settings: Object });
defineEmits(["close"]);
function reason(r) {
  return t(
    r.key,
    r.tags
      ? { tags: r.tags.map((x) => t("categories." + x)).join(" / ") }
      : r.params,
  );
}
</script>
<template>
  <ModalShell :title="placeName(stop.place)" @close="$emit('close')"
    ><PlaceImage :place="stop.place" />
    <div class="detail-body">
      <div class="detail-meta">
        <span>{{ t("categories." + stop.place.category) }}</span
        ><CrowdBadge :value="stop.crowd" />
      </div>
      <TouristReviews :place="stop.place" :destination="{city: stop.place.city, country: stop.place.country}" />
      <p>{{ t(stop.place.description) }}</p>
      <dl>
        <div>
          <dt>{{ t("price") }}</dt>
          <dd>
            {{
              stop.place.price != null
                ? "¥" + stop.place.price
                : t("livePlan.costReserve", { n: stop.place.costEstimate })
            }}
          </dd>
        </div>
        <div>
          <dt>{{ t("stay") }}</dt>
          <dd>{{ stop.duration }} {{ t("minutes") }}</dd>
        </div>
        <div>
          <dt>{{ t("opening") }}</dt>
          <dd>{{ stop.place.openingHours || t("livePlan.openingUnknown") }}</dd>
        </div>
      </dl>
      <div class="chips">
        <span class="chip" v-for="tag in stop.place.tags" :key="tag">{{
          t("categories." + tag)
        }}</span>
      </div>
      <h3>{{ t("why") }}</h3>
      <ul class="reasons">
        <li
          v-for="(r, i) in recommendationReasons(stop.place, settings)"
          :key="i"
        >
          {{ reason(r) }}
        </li>
      </ul>
      <span v-if="settings.wishIds.includes(stop.place.id)" class="pill"
        >♡ {{ t("wished") }}</span
      ><small class="source-note">{{
        t(stop.place.source === "amap" ? "livePlan.badge" : "mockBadge")
      }}</small>
    </div></ModalShell
  >
</template>
