<script setup>
import {language,setLanguage} from "../i18n";
</script>
<template>
  <div class="language" aria-label="Language">
    <button
      :class="{ active: language === 'zh' }"
      @click="setLanguage('zh')"
      :aria-pressed="language === 'zh'"
    >
      中文</button
    ><span>/</span
    ><button
      :class="{ active: language === 'en' }"
      @click="setLanguage('en')"
      :aria-pressed="language === 'en'"
    >
      EN
    </button>
  </div>
</template>
