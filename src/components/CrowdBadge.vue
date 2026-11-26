<script setup>
import {t} from "../i18n";
defineProps({ value: Number });
</script>
<template>
  <span
    class="crowd-badge"
    :class="
      value == null
        ? 'unknown'
        : value >= 65
          ? 'busy'
          : value >= 35
            ? 'moderate'
            : 'quiet'
    "
    ><i /><template v-if="value == null">{{
      t("livePlan.crowdUnknown")
    }}</template
    ><template v-else
      >{{ t("estimatedCrowd") }} ·
      {{
        t(
          `crowdLabels.${value == null ? "unknown" : value >= 65 ? "high" : value >= 35 ? "medium" : "low"}`,
        )
      }}</template
    ></span
  >
</template>
