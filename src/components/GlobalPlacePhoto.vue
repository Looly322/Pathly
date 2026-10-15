<script setup>
import { ref, watch } from 'vue';
import { t } from '../i18n';
const props=defineProps({place:Object});
const emit=defineEmits(['retry']);
const failed=ref(false), useFallback=ref(false);
function imageError(){if(props.place.photo?.fallbackUrl && !useFallback.value) useFallback.value=true;else failed.value=true;}
watch(()=>props.place.photoStatus,()=>{failed.value=false;useFallback.value=false;});
function retry(){failed.value=false;emit('retry');}
</script>
<template><figure class="global-photo"><img v-if="place.photo?.url && !failed" :src="useFallback ? place.photo.fallbackUrl : place.photo.url" :alt="place.name" loading="lazy" @error="imageError"/><figcaption v-if="place.photo && !failed"><a :href="place.photo.page" target="_blank" rel="noopener noreferrer">{{place.photo.author}} · {{place.photo.license}}</a></figcaption><div v-else class="photo-status"><span>{{t(place.photoStatus==='loading' ? 'global.photoLoading' : failed || place.photoStatus==='error' ? 'global.photoError' : 'global.noPhoto')}}</span><button v-if="place.photoStatus!=='loading'" class="text-button" @click="retry">{{t('global.retry')}}</button></div></figure></template>
<style scoped>.global-photo{margin:0;min-width:0}.global-photo img{width:100%;height:130px;object-fit:cover;border-radius:9px}.photo-status{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary)}figcaption{font-size:9px;line-height:1.5;overflow-wrap:anywhere;margin-top:6px}figcaption a{color:var(--text-secondary)}</style>
