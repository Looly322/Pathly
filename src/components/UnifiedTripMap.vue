<script setup>
import {defineAsyncComponent} from 'vue';
const MapPlanner=defineAsyncComponent(()=>import('./MapPlanner.vue'));
const GlobalMap=defineAsyncComponent(()=>import('./GlobalMap.vue'));
defineProps({destination:Object,places:Array,active:String,selecting:Boolean,routePaths:{type:Array,default:()=>[]}});
defineEmits(['select','add','pick']);
</script>
<template><MapPlanner v-if="destination.countryCode==='CN'" :selected-city="destination.displayName" :places="places" :active="active" :read-only="!selecting" :allow-custom="false" :show-route="!selecting" :route-paths="routePaths" @select="$emit('select',$event)" @add="$emit('add',$event)"/><GlobalMap v-else :destination="destination" :places="places" :route="selecting?[]:places" :selected-id="active" @select="$emit('select',$event)" @pick="$emit('pick',$event)"/></template>
