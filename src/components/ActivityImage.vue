<script setup>
import {ref,computed,watch} from 'vue';
import {t} from '../i18n';
import {imageCandidates,imageCategory} from '../providers/imageProvider';
const props=defineProps({place:Object});
const index=ref(0),images=computed(()=>imageCandidates(props.place));
watch(()=>props.place.id,()=>index.value=0);
const icons={CULTURE:'▥',ART:'◇',NATURE:'♧',FOOD:'♨',CAFE:'☕',SHOPPING:'▱',ATTRACTION:'⌖'};
</script>
<template><figure class="activity-image"><img v-if="images[index]" :src="images[index]" :alt="place.name" loading="lazy" @error="index++"/><div v-else class="category-art"><span aria-hidden="true">{{icons[imageCategory(place)]}}</span><strong>{{t('planner.types.'+imageCategory(place))}}</strong><small>{{t('planner.illustration')}}</small></div><figcaption v-if="images[index] && place.photo?.author">{{place.photo.author}} · {{place.photo.license}}</figcaption></figure></template>
<style scoped>.activity-image{margin:0;width:112px;flex:none}.activity-image img,.category-art{width:100%;height:116px;object-fit:cover;border-radius:12px}.category-art{background:var(--primary-soft);color:var(--primary);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px}.category-art span{font-size:28px}.category-art strong{font-size:12px}.category-art small,figcaption{font-size:10px;color:var(--text-secondary)}figcaption{overflow-wrap:anywhere}@media(max-width:500px){.activity-image{width:80px}}</style>
