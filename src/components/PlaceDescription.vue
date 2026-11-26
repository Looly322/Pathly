<script setup>
import {computed,ref,watch} from 'vue';
import {language} from '../i18n';
const props=defineProps({place:Object}),expanded=ref(false);
const text=computed(()=>language.value==='zh'?(props.place.descriptionZh||props.place.description):(props.place.descriptionEn||props.place.description));
const original=computed(()=>text.value&&(language.value==='zh'?(!props.place.descriptionZh&&!/[\u4e00-\u9fff]/.test(text.value)):(props.place.descriptionLanguage&&props.place.descriptionLanguage!=='en'&&!props.place.descriptionEn)));
watch(()=>props.place.id,()=>expanded.value=false);
</script>
<template><section v-if="text" class="place-description"><small v-if="original">{{language==='zh'?'暂无中文介绍，以下为来源原文。':'English description unavailable. Original source text follows.'}}</small><p :class="{clamped:!expanded}">{{text}}</p><button v-if="text.length>120" class="text-button" @click.stop="expanded=!expanded">{{language==='zh'?(expanded?'收起':'展开介绍'):(expanded?'Show less':'Read more')}}</button><a v-if="language==='zh'&&place.descriptionZh&&place.descriptionZhSource" :href="place.descriptionZhSource" target="_blank" rel="noopener noreferrer">Wikidata</a></section></template>
<style scoped>.clamped{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.place-description{font-size:12px;line-height:1.7}.place-description p{margin:6px 0}.place-description small{color:var(--text-secondary)}.place-description button{font-size:12px}</style>
