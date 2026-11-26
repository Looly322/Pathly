<script setup>
import { t } from '../i18n'
import ModalShell from './ModalShell.vue'
defineProps({plans:Array});defineEmits(['close'])
const rows=[['count','count',''],['cost','cost','¥'],['distance','distance','km'],['crowding','crowding','/100'],['free','free','min'],['stability','stability','/100']]
</script>
<template><ModalShell :title="t('compare')" @close="$emit('close')"><div class="table-scroll"><table><thead><tr><th>Pathly</th><th v-for="plan in plans" :key="plan.id">{{t(plan.id)}}</th></tr></thead><tbody><tr v-for="[label,key,unit] in rows" :key="key"><th>{{t(label)}}</th><td v-for="plan in plans" :key="plan.id">{{unit==='¥'?'¥':''}}{{plan[key]}} {{unit==='¥'?'':unit==='min'?t('minutes'):unit}}</td></tr></tbody></table></div></ModalShell></template>
