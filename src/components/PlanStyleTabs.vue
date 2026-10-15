<script setup>
import { t } from "../i18n";
defineProps({ modelValue: String, plans: { type: Array, default: () => [] } });
defineEmits(["update:modelValue"]);
</script>
<template>
  <div class="plan-tabs" role="tablist">
    <button
      v-for="(id, i) in ['explorer', 'slow', 'crowd']"
      :key="id"
      role="tab"
      :aria-selected="modelValue === id"
      :class="{ selected: modelValue === id }"
      @click="$emit('update:modelValue', id)"
    >
      <span class="tab-icon">{{ ["↗", "☕", "≋"][i] }}</span>
      <span
        ><strong>{{ t(id) }}</strong
        ><small>{{ t(id + "Desc") }}</small>
        <span v-if="plans[i]" class="tab-metrics"
          ><b>{{
            t("styleLogic.count", {
              n: plans[i].attractions,
              total: plans[i].count,
            })
          }}</b
          ><small
            >{{ t("styleLogic.stay", { n: plans[i].averageStay }) }} ·
            {{
              t("styleLogic.crowdMetric", {
                n: plans[i].crowding ?? t("livePlan.unknown"),
              })
            }}</small
          ></span
        >
      </span>
      <span v-if="modelValue === id" class="tab-check">✓</span>
    </button>
  </div>
</template>
