<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { t, language } from '../i18n';
import { placeName } from '../utils/globalLabels';
const props=defineProps({destination:Object,places:Array,selectedId:String});
const emit=defineEmits(['select']);
const container=ref(null), failed=ref(false);
let map, layer, tiles, observer;
const markers=new Map();
function fit() {
  if (!map) return;
  const points=props.places.map(p=>[p.latitude,p.longitude]);
  if (points.length) map.fitBounds(L.latLngBounds(points),{padding:[30,30],maxZoom:15});
  else map.setView([props.destination.latitude,props.destination.longitude],12);
}
function draw() {
  if (!map) return;
  layer.clearLayers(); markers.clear();
  props.places.forEach((p,i)=>{
    const button=document.createElement('button'); button.type='button';button.className='global-pin' + (props.selectedId===p.id?' active':'');button.textContent=String(i+1);button.setAttribute('aria-label',`${i+1}. ${placeName(p)}`);
    const marker=L.marker([p.latitude,p.longitude],{icon:L.divIcon({html:button,className:'global-marker',iconSize:[34,34],iconAnchor:[17,34]}),keyboard:false}).addTo(layer);
    const label=document.createElement('span');label.textContent=`${i+1}. ${placeName(p)}`;
    marker.bindTooltip(label,{direction:'top'});
    button.addEventListener('click',()=>emit('select',p.id));
    markers.set(p.id,marker);
  });
}
function retry(){failed.value=false;tiles.redraw();}
onMounted(()=>{
  map=L.map(container.value,{scrollWheelZoom:false}).setView([props.destination.latitude,props.destination.longitude],12);
  tiles=L.tileLayer(import.meta.env.VITE_WORLD_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  tiles.on('tileerror',()=>failed.value=true);
  layer=L.layerGroup().addTo(map);draw();fit();
  observer=new ResizeObserver(()=>map?.invalidateSize());observer.observe(container.value);
});
watch(()=>props.places,()=>{draw();fit();});
watch(()=>props.destination,()=>{draw();fit();});
watch([()=>props.selectedId,language],()=>{draw();const marker=markers.get(props.selectedId);if(marker){map.panTo(marker.getLatLng());marker.openTooltip();}});
onBeforeUnmount(()=>{observer?.disconnect();map?.remove();map=null;});
</script>
<template><section class="world-map"><div class="world-map-toolbar"><strong>{{t('global.mapTitle')}}</strong><button class="outline" @click="fit">{{t('global.showAll')}}</button></div><div ref="container" class="world-map-canvas" :aria-label="t('global.mapTitle')"></div><p v-if="failed" role="status">{{t('global.mapFailed')}} <button @click="retry">{{t('global.retry')}}</button></p><p class="world-map-note">{{t('global.mapNote')}}</p></section></template>
<style>
.world-map{border:1px solid var(--border);border-radius:16px;overflow:hidden;margin:24px 0}.world-map-toolbar{display:flex;justify-content:space-between;align-items:center;padding:16px;gap:12px}.world-map-canvas{height:420px;z-index:0}.world-map-note{padding:12px 16px;font-size:13px;color:var(--text-secondary)}.global-pin{width:34px;height:34px;padding:0;background:var(--primary);color:white;border:2px solid white;border-radius:50%;box-shadow:0 2px 7px #0005;cursor:pointer;font-weight:bold}.global-pin.active{outline:3px solid var(--primary);transform:scale(1.15)}.world-map .leaflet-control-zoom a{color:#222}.world-map .leaflet-container{font-family:inherit}@media(max-width:540px){.world-map-canvas{height:320px}}
</style>
