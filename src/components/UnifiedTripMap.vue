<script setup>
import {defineAsyncComponent} from 'vue';
const MapPlanner=defineAsyncComponent(()=>import('./MapPlanner.vue'));
const GlobalMap=defineAsyncComponent(()=>import('./GlobalMap.vue'));
defineProps({destination:Object,places:Array,active:String,selecting:Boolean});
defineEmits(['select','add','pick']);
</script>
<template><MapPlanner v-if="destination.countryCode==='CN'" :selected-city="destination.displayName" :places="places" :active="active" :read-only="!selecting" :show-route="!selecting" @select="$emit('select',$event)" @add="$emit('add',$event)"/><GlobalMap v-else :destination="destination" :places="places" :route="selecting?[]:places" :selected-id="active" @select="$emit('select',$event)" @pick="$emit('pick',$event)"/></template>
