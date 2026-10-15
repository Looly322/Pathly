<script setup>
import { language, t } from "../i18n";
defineProps({ modelValue: String });
defineEmits(["update:modelValue"]);
const popular = [
  ["北京", "Beijing"],
  ["上海", "Shanghai"],
  ["杭州", "Hangzhou"],
  ["苏州", "Suzhou"],
  ["成都", "Chengdu"],
  ["重庆", "Chongqing"],
  ["厦门", "Xiamen"],
];
</script>
<template>
  <label class="field destination"
    >{{ t("city") }}
    <div class="input-icon">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <circle
          cx="12"
          cy="10"
          r="2.5"
          stroke="currentColor"
          stroke-width="1.5"
        /></svg
      ><input
        required
        maxlength="60"
        :value="modelValue"
        :placeholder="t('placeholder')"
        @input="$emit('update:modelValue', $event.target.value)"
      /></div
  ></label>
  <div class="popular">
    <span>{{ t("popular") }}</span
    ><button
      type="button"
      v-for="city in popular"
      :key="city[0]"
      @click="$emit('update:modelValue', city[language === 'zh' ? 0 : 1])"
    >
      {{ city[language === "zh" ? 0 : 1] }}
    </button>
  </div>
</template>
