<script setup>
import {ref} from "vue";
import {themes,theme,customColor,setTheme} from "../utils/theme";
import {t} from "../i18n";
const open = ref(false);
</script>
<template>
  <div class="theme-control">
    <button class="theme-trigger" @click="open = !open" :aria-expanded="open">
      <span class="color-dot" />{{ t("theme") }} <span>⌄</span>
    </button>
    <div v-if="open" class="theme-popover">
      <button
        v-for="(color, name) in themes"
        :key="name"
        @click="setTheme(name)"
        :aria-pressed="theme === name"
      >
        <i :style="{ background: color }" />{{ name
        }}<span v-if="theme === name">✓</span></button
      ><label class="custom-color"
        >{{ t("custom")
        }}<input
          aria-label="Custom theme color"
          type="color"
          :value="customColor"
          @input="setTheme('Custom', $event.target.value)" /></label
      ><button @click="open = false">{{ t("close") }}</button>
    </div>
  </div>
</template>
