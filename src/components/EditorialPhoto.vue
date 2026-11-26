<script setup>
import {ref,watch} from 'vue';
import {language} from '../i18n';
const props=defineProps({image:String,alt:String,hero:Boolean});const failed=ref(false);watch(()=>props.image,()=>failed.value=false);
</script>
<template><div class="editorial-photo" :class="{'photo-unavailable':failed}"><img v-if="!failed" :src="'/images/home/'+image+'.webp'" :srcset="hero?'/images/home/dolomites-small.webp 800w, /images/home/dolomites.webp 1920w':undefined" :sizes="hero?'100vw':undefined" :alt="alt" :loading="hero?'eager':'lazy'" :fetchpriority="hero?'high':'auto'" decoding="async" @error="failed=true"/><span v-else class="editorial-fallback"><span aria-hidden="true">↗</span>{{alt}}<small>{{language==='zh'?'旅行影像暂不可用':'Travel photograph unavailable'}}</small></span></div></template>
<style scoped>.editorial-photo{height:100%;width:100%;overflow:hidden;background:#344942}.editorial-photo img{width:100%;height:100%;object-fit:cover;display:block}.editorial-fallback{height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:12px;padding:20px;color:white}.editorial-fallback>span{font-size:36px}.editorial-fallback small{color:#fff9}</style>
