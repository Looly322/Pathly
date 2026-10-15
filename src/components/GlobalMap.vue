<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue';
import {Map as GLMap,Marker,Popup,NavigationControl,LngLatBounds,setWorkerUrl} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {t,language} from '../i18n';
import {WORLD_MAP_STYLE,applyWorldMapStyle,mapPlaceName} from '../utils/mapStyle';
setWorkerUrl(workerUrl);
const props=defineProps({destination:Object,places:{type:Array,default:()=>[]},selectedId:String,route:{type:Array,default:()=>[]}});
const emit=defineEmits(['select','pick']);
const container=ref(null),failed=ref(false),mapLanguage=ref(language.value);
let map,observer,loadTimer;const markers=new Map();
const valid=p=>Number.isFinite(Number(p?.latitude))&&Number.isFinite(Number(p?.longitude))&&Math.abs(Number(p.latitude))<=90&&Math.abs(Number(p.longitude))<=180;
const coords=p=>[Number(p.longitude),Number(p.latitude)];
function translateMap(){if(map?.getStyle()?.layers)applyWorldMapStyle(map,mapLanguage.value);}
function fit(){
 if(!map)return;
 const places=props.places.filter(valid);
 if(places.length){const bounds=new LngLatBounds();places.forEach(p=>bounds.extend(coords(p)));map.fitBounds(bounds,{padding:48,maxZoom:15,duration:0});}
 else if(valid(props.destination))map.jumpTo({center:coords(props.destination),zoom:12});
}
function draw(){
 if(!map)return;
 markers.forEach(m=>m.remove());markers.clear();
 props.places.forEach((p,i)=>{
  if(!valid(p))return;
  const button=document.createElement('button');button.type='button';button.className='global-pin'+(props.selectedId===p.id?' active':'');button.textContent=i+1;
  const name=mapPlaceName(p,mapLanguage.value);button.setAttribute('aria-label',`${i+1}. ${name}`);
  const content=document.createElement('div'),title=document.createElement('strong');title.textContent=`${i+1}. ${name}`;content.append(title);
  if(p.address){const address=document.createElement('p');address.textContent=p.address;content.append(address);}
  const popup=new Popup({offset:18,closeButton:true,maxWidth:'260px',focusAfterOpen:false}).setDOMContent(content);
  const marker=new Marker({element:button}).setLngLat(coords(p)).setPopup(popup).addTo(map);
  button.addEventListener('click',e=>{e.stopPropagation();emit('select',p.id);});
  if(props.selectedId===p.id)popup.setLngLat(coords(p)).addTo(map);
  markers.set(p.id,marker);
 });
 drawRoute();
}
function drawRoute(){
 if(!map?.isStyleLoaded())return;
 const points=props.route.filter(valid).map(coords);
 const data={type:'FeatureCollection',features:points.length>1?[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:points}}]:[]};
 if(map.getSource('pathly-route'))map.getSource('pathly-route').setData(data);
 else{map.addSource('pathly-route',{type:'geojson',data});map.addLayer({id:'pathly-route',source:'pathly-route',type:'line',paint:{'line-color':getComputedStyle(container.value).getPropertyValue('--primary').trim()||'#6945a0','line-width':3,'line-dasharray':[2,2]}});}
}
function retry(){failed.value=false;map?.setStyle(WORLD_MAP_STYLE);armTimeout();}
function armTimeout(){clearTimeout(loadTimer);loadTimer=setTimeout(()=>{if(map&&!map.isStyleLoaded())failed.value=true;},15000);}
function streetView(){map?.setZoom(17);}
watch(language,value=>mapLanguage.value=value);
watch(mapLanguage,()=>{translateMap();draw();});
watch(()=>props.places,draw,{deep:true});
watch(()=>props.places.map(p=>p.id).join('|'),fit);
watch(()=>props.route,drawRoute,{deep:true});
watch(()=>props.destination.id,()=>{if(map&&valid(props.destination))map.jumpTo({center:coords(props.destination),zoom:12});draw();fit();});
watch(()=>props.selectedId,()=>{draw();const marker=markers.get(props.selectedId);if(marker){map.panTo(marker.getLngLat(),{duration:0});if(!marker.getPopup().isOpen())marker.togglePopup();}});
onMounted(()=>{
 try{
  map=new GLMap({container:container.value,style:WORLD_MAP_STYLE,center:valid(props.destination)?coords(props.destination):[0,0],zoom:12,minZoom:2,maxZoom:20});
  map.addControl(new NavigationControl({showCompass:false}),'top-left');
  map.on('click',e=>emit('pick',{latitude:e.lngLat.lat,longitude:e.lngLat.lng}));
  map.on('style.load',()=>{clearTimeout(loadTimer);failed.value=false;translateMap();drawRoute();});
  map.on('error',()=>{if(!map.isStyleLoaded())failed.value=true;});
  map.on('idle',()=>{if(map.isStyleLoaded())failed.value=false;});
  draw();fit();armTimeout();observer=new ResizeObserver(()=>map?.resize());observer.observe(container.value);
 }catch{failed.value=true;}
});
onBeforeUnmount(()=>{clearTimeout(loadTimer);observer?.disconnect();markers.forEach(m=>m.remove());map?.remove();map=null;});
</script>
<template><section class="world-map"><div class="world-map-toolbar"><strong>{{t('global.mapTitle')}}</strong><select v-model="mapLanguage" :aria-label="t('global.mapLanguage')"><option value="zh">中文</option><option value="en">English</option><option value="local">{{t('global.localLanguage')}}</option></select><button class="outline" @click="streetView">{{t('global.streetView')}}</button><button class="outline" @click="fit">{{t('global.showAll')}}</button></div><div ref="container" class="world-map-canvas" :aria-label="t('global.mapTitle')"></div><p v-if="failed" role="status">{{t('global.mapFailed')}} <button @click="retry">{{t('global.retry')}}</button></p><p v-if="route.length>1" class="world-map-route-note"><span aria-hidden="true">┄</span> {{t('global.routeSchematic')}}</p><p class="world-map-note">{{t('global.mapNote')}}</p></section></template>
<style>
.world-map{border:1px solid var(--border);border-radius:16px;overflow:hidden;margin:24px 0}.world-map-toolbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;padding:16px;gap:12px}.world-map-canvas{height:420px;z-index:0}.world-map-note{padding:12px 16px;font-size:13px;color:var(--text-secondary)}.global-pin{width:28px;height:28px;padding:0;background:var(--primary);color:white;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px #0003;cursor:pointer;font-weight:bold}.global-pin.active{outline:3px solid var(--primary);transform:scale(1.08)}.world-map .leaflet-control-zoom{border:1px solid var(--border);border-radius:10px;overflow:hidden;box-shadow:0 2px 8px #0001}.world-map .leaflet-control-zoom a{color:var(--primary);background:var(--surface);width:34px;height:34px;line-height:34px}.world-map .leaflet-control-zoom a:hover{background:var(--primary-soft)}.world-map-toolbar select{border:1px solid var(--border);border-radius:7px;padding:7px;background:var(--surface);color:var(--text-primary)}.world-map-route-note{font-size:12px;margin:0;padding:10px 16px;background:var(--primary-soft);color:var(--text-primary)}.world-map-route-note span{color:var(--primary);font-size:20px;margin-right:6px}.pathly-place-popup{font-size:13px;max-width:260px;overflow-wrap:anywhere}.global-pin:focus-visible{outline:3px solid var(--primary);outline-offset:3px}.global-pin.active{background:var(--primary-dark,var(--primary))}.world-map .maplibregl-map{font-family:inherit}.world-map .maplibregl-ctrl-group{border:1px solid var(--border);border-radius:9px;overflow:hidden}.world-map .maplibregl-ctrl-group button{width:34px;height:34px}.world-map .maplibregl-popup-content{font-family:inherit;line-height:1.5;overflow-wrap:anywhere}@media(max-width:540px){.world-map-canvas{height:320px}}
</style>
