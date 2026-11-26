<script setup>
import { ref,watch } from 'vue'
import { t,placeName } from '../i18n'
const props=defineProps({place:Object})
const failed=ref(false);watch(()=>props.place.image,()=>failed.value=false)
</script>
<template><div class="place-image"><img v-if="place.image&&!failed" :src="place.image" :alt="placeName(place)" loading="lazy" @error="failed=true"><div v-else class="image-fallback"><svg viewBox="0 0 80 60" fill="none" aria-hidden="true"><path d="m5 50 24-30 16 20 10-12 20 22H5Z" stroke="currentColor" stroke-width="1.5"/><circle cx="56" cy="14" r="6" stroke="currentColor" stroke-width="1.5"/></svg><span>{{t('imageFallback')}}</span></div></div></template>
