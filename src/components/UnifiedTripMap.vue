<script setup>
import {defineAsyncComponent} from 'vue';
const MapPlanner=defineAsyncComponent(()=>import('./MapPlanner.vue'));
const GlobalMap=defineAsyncComponent(()=>import('./GlobalMap.vue'));
defineProps({destination:Object,places:Array,itineraryRoute:Array,active:String,selecting:Boolean,marking:Boolean,routePaths:{type:Array,default:()=>[]}});
defineEmits(['select','add','pick']);
</script>
<template><MapPlanner v-if="destination.countryCode==='CN'" :selected-city="destination.displayName" :places="places" :active="active" :read-only="!selecting" :allow-custom="false" :marking="marking" @map-point="$emit('pick',$event)" :show-route="!selecting" :route-paths="routePaths" @select="$emit('select',$event)" @add="$emit('add',$event)"/><GlobalMap v-else :destination="destination" :places="places" :route="selecting?[]:(itineraryRoute||places)" :selected-id="active" @select="$emit('select',$event)" @pick="$emit('pick',$event)"/></template>
