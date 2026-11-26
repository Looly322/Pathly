<script setup>
import {ref,computed,watch,onMounted,onBeforeUnmount,nextTick} from 'vue';
import {t} from '../i18n';
import {imageCandidates,imageCategory} from '../providers/imageProvider';
const emit=defineEmits(['retry','unavailable']);
const props=defineProps({place:Object});
const frame=ref(null),imageElement=ref(null);const loadedUrls=new Set();let timer,observer;const visible=ref(false);
const index=ref(0),images=computed(()=>imageCandidates(props.place));
watch(()=>[props.place.id,props.place.photoRevision,...images.value].join('|'),()=>index.value=0);
function failed(){clearTimeout(timer);index.value++;if(!images.value[index.value])emit('unavailable');}
function loaded(){clearTimeout(timer);if(imageElement.value?.currentSrc)loadedUrls.add(imageElement.value.currentSrc);}
watch([()=>images.value[index.value],visible],()=>{clearTimeout(timer);if(visible.value&&images.value[index.value]&&!loadedUrls.has(images.value[index.value]))timer=setTimeout(()=>{if(imageElement.value?.complete&&imageElement.value.naturalWidth>0)loaded();else failed();},12000);},{immediate:true});
onMounted(()=>{observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){visible.value=true;observer.disconnect();}},{rootMargin:'200px'});observer.observe(frame.value);});
onBeforeUnmount(()=>{clearTimeout(timer);observer?.disconnect();});
const icons={CULTURE:'▥',ART:'◇',NATURE:'♧',FOOD:'♨',CAFE:'☕',SHOPPING:'▱',ATTRACTION:'⌖'};
</script>
<template><figure ref="frame" class="activity-image"><img :key="String(place.photoRevision)+images[index]" ref="imageElement" v-if="images[index]" :src="images[index]" :alt="place.name" loading="lazy" decoding="async" @load="loaded" @error="failed"/><div v-else-if="place.photoStatus==='loading'" class="category-art" role="status">{{t('planner.loadingMedia')}}</div><div v-else class="category-art"><span aria-hidden="true">{{icons[imageCategory(place)]}}</span><strong>{{t('planner.types.'+imageCategory(place))}}</strong><small>{{t('planner.illustration')}}</small><button class="text-button" @click.stop="emit('retry')">{{t('global.retry')}}</button></div><figcaption v-if="images[index] && place.photo?.author"><a v-if="place.photo.page" :href="place.photo.page" target="_blank" rel="noopener noreferrer">{{place.photo.author}} · {{place.photo.license}}</a><span v-else>{{place.photo.author}} · {{place.photo.license}}</span></figcaption></figure></template>
<style scoped>.activity-image{margin:0;width:112px;flex:none}.activity-image img,.category-art{width:100%;height:116px;object-fit:cover;border-radius:12px}.category-art{background:var(--primary-soft);color:var(--primary);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px}.category-art span{font-size:28px}.category-art strong{font-size:12px}.category-art small,figcaption{font-size:10px;color:var(--text-secondary)}figcaption{overflow-wrap:anywhere}@media(max-width:500px){.activity-image{width:80px}}</style>
