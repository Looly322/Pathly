<script setup>
import {t} from "../i18n";
defineProps({ value: Object });
</script>
<template>
  <section class="stability-card">
    <div class="label-row">
      <h3>{{ t("stability") }}</h3>
      <span>{{ t(value.level) }}</span>
    </div>
    <div class="score">
      <strong>{{ value.score }}</strong
      ><span>/ 100</span><span class="score-symbol">↗</span>
    </div>
    <div
      class="progress"
      role="progressbar"
      :aria-label="t('stability')"
      :aria-valuenow="value.score"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span :style="{ width: value.score + '%' }" />
    </div>
    <ul>
      <li v-for="(r, i) in value.reasons" :key="'r' + i">
        <span>✓</span>{{ t(r.key, r.params) }}
      </li>
      <li
        v-for="(r, i) in value.warnings"
        :key="'w' + i"
        class="warning-reason"
      >
        <span>△</span>{{ t(r.key, r.params) }}
      </li>
    </ul>
  </section>
</template>
