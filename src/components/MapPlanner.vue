<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { t, language } from '../i18n';
import { theme, customColor } from '../utils/theme.js';
import { isAmapConfigured, loadAmap, withTimeout } from '../services/amapService.js';
import { resolveMapCity } from '../services/cityService.js';
import { hasValidCoordinates } from '../utils/geo.js';
const props=defineProps({selectedCity:String,places:Array,active:String,focusedPlace:Object,focusKey:Number,fitKey:Number,marking:Boolean,draftPoint:Object,showRoute:Boolean});
const emit=defineEmits(['status','city-resolved','select','add','map-point','cancel-mark']);
const container=ref(null),status=ref('loading'),cityState=ref('idle'),resolvedName=ref(''),popupPlace=ref(null);
// SDK 对象保持普通变量，避免 Vue 代理破坏第三方实例的内部状态。
let AMap,map,polyline,previewMarker,draftMarker;
const markers=new Map();
let disposed=false,initializing=false,cityRequest=0,lifecycle=0,suppressClickUntil=0;
const primary=()=>getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
function setStatus(value){status.value=value;emit('status',value);}
function createContent(place,number){
  const el=document.createElement('button');el.type='button';
  el.className=`pathly-map-marker${place.source==='custom'?' custom-marker':''}${props.active===place.id?' is-active':''}`;
  el.textContent=String(number);el.title=place.name;el.setAttribute('aria-label',`${number}. ${place.name}`);
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();focusPlace(place);emit('select',place.id);}});
  return el;
}
function createMarker(place,number){
  const marker=new AMap.Marker({position:[place.longitude,place.latitude],content:createContent(place,number),anchor:'center',bubble:false,zIndex:props.active===place.id?150:110});
  marker.on('click',()=>{focusPlace(place);emit('select',place.id);});
  marker.setMap(map);return marker;
}
function removeMarker(marker){if(marker)marker.setMap(null);}
function syncOverlays(){
  if(!map||status.value!=='ready')return;
  const valid=props.places.filter(hasValidCoordinates),ids=new Set(valid.map(p=>p.id));
  for(const [id,marker] of markers){if(!ids.has(id)){removeMarker(marker);markers.delete(id);}}
  valid.forEach((place,i)=>{
    if(!markers.has(place.id))markers.set(place.id,createMarker(place,i+1));
    const marker=markers.get(place.id);
    marker.setContent(createContent(place,i+1));marker.setPosition([place.longitude,place.latitude]);marker.setzIndex(props.active===place.id?150:110);
  });
  if(props.showRoute&&valid.length>=2){
    const path=valid.map(p=>[p.longitude,p.latitude]);
    if(!polyline){polyline=new AMap.Polyline({path,strokeColor:primary(),strokeWeight:4,strokeOpacity:.85,strokeStyle:'dashed',lineJoin:'round',showDir:true,zIndex:60,bubble:false});polyline.setMap(map);}
    else {polyline.setPath(path);polyline.setOptions({strokeColor:primary()});}
  } else if(polyline){polyline.setMap(null);polyline=null;}
  removeMarker(previewMarker);previewMarker=null;
  if(popupPlace.value&&hasValidCoordinates(popupPlace.value)&&!ids.has(popupPlace.value.id))previewMarker=createMarker(popupPlace.value,'＋');
  removeMarker(draftMarker);draftMarker=null;
  if(props.draftPoint&&hasValidCoordinates(props.draftPoint)){
    const content=document.createElement('span');content.className='pathly-map-marker custom-marker';content.textContent='＋';
    draftMarker=new AMap.Marker({position:[props.draftPoint.longitude,props.draftPoint.latitude],content,anchor:'center',bubble:false});draftMarker.setMap(map);
  }
}
function focusPlace(place){
  if(!map||status.value!=='ready'||!hasValidCoordinates(place))return;
  popupPlace.value=place;map.setZoomAndCenter(16,[place.longitude,place.latitude]);syncOverlays();
}
function closePreview(){popupPlace.value=null;syncOverlays();}
function fitView(){
  if(!map||status.value!=='ready')return;
  const overlays=[...markers.values()];
  if(overlays.length)map.setFitView(overlays,false,[70,55,70,55],16);
}
async function locateCity(){
  const request=++cityRequest;resolvedName.value='';cityState.value=props.selectedCity?'loading':'idle';
  emit('city-resolved',null);popupPlace.value=null;syncOverlays();
  if(!map||status.value!=='ready')return;
  if(!props.selectedCity){map.setZoomAndCenter(4,[104,35]);return;}
  try{
    const result=await resolveMapCity(props.selectedCity);
    if(disposed||request!==cityRequest)return;
    cityState.value='ready';resolvedName.value=result.name;
    map.setZoomAndCenter(12,[result.longitude,result.latitude]);emit('city-resolved',result);
  }catch{if(!disposed&&request===cityRequest)cityState.value='error';}
}
function mapClick(event){
  if(!props.marking||props.draftPoint||cityState.value!=='ready'||Date.now()<suppressClickUntil)return;
  const point={longitude:event.lnglat.getLng(),latitude:event.lnglat.getLat()};
  if(hasValidCoordinates(point))emit('map-point',point);
}
function destroyMap(){
  for(const marker of markers.values())removeMarker(marker);markers.clear();
  map?.destroy();map=null;polyline=null;previewMarker=null;draftMarker=null;
}
async function initialize(){
  if(initializing||disposed)return;
  if(!isAmapConfigured()){setStatus('unconfigured');return;}
  initializing=true;const generation=++lifecycle;setStatus('loading');
  try{
    AMap=await loadAmap();
    if(disposed||generation!==lifecycle)return;
    await nextTick();destroyMap();
    map=new AMap.Map(container.value,{viewMode:'2D',zoom:4,center:[104,35],zooms:[3,20],resizeEnable:true,dragEnable:true,zoomEnable:true,scrollWheel:true,doubleClickZoom:true});
    map.addControl(new AMap.Scale());map.addControl(new AMap.ToolBar({position:'RB'}));
    map.on('click',mapClick);
    map.on('dragstart',()=>suppressClickUntil=Infinity);
    map.on('dragend',()=>suppressClickUntil=Date.now()+200);
    await withTimeout(new Promise(resolve=>map.on('complete',resolve)),'AMAP_LOAD_FAILED');
    if(disposed||generation!==lifecycle)return;
    setStatus('ready');syncOverlays();await locateCity();
  }catch{
    if(!disposed&&generation===lifecycle){destroyMap();setStatus('error');emit('city-resolved',null);}
  }finally{initializing=false;}
}
watch(()=>props.selectedCity,()=>{emit('cancel-mark');locateCity();});
watch(()=>[props.places,props.active,props.draftPoint,props.showRoute],syncOverlays,{deep:true});
watch(()=>props.focusKey,()=>{if(props.focusedPlace)focusPlace(props.focusedPlace);else closePreview();});
watch(()=>props.fitKey,fitView);
watch([theme,customColor,language],syncOverlays);
watch(()=>props.marking,value=>map?.setDefaultCursor(value?'crosshair':'grab'));
onMounted(initialize);
onBeforeUnmount(()=>{disposed=true;lifecycle++;cityRequest++;destroyMap();});
</script>
<template><section class="real-map-card" :aria-label="t('map.title')">
  <div class="real-map-toolbar"><div><span class="section-kicker">{{t('map.mode')}}</span><h2>{{selectedCity||t('map.noCity')}}</h2></div><div><button class="outline" :disabled="status!=='ready'||cityState!=='ready'" :class="{selected:marking}" @click="$emit('cancel-mark',!marking)">{{t(marking?'map.cancelMark':'map.custom')}}</button><button class="outline fit-map" :disabled="status!=='ready'||!places.length" @click="fitView">{{t('map.fit')}}</button></div></div>
  <div class="real-map-frame"><div ref="container" class="amap-container" :aria-label="t('map.title')"/>
    <div v-if="status!=='ready'" class="map-status" :role="status==='error'?'alert':'status'"><span class="map-status-symbol">⌖</span><strong>{{t(status==='unconfigured'?'map.unconfigured':status==='error'?'map.loadError':'map.loading')}}</strong><p v-if="status==='unconfigured'">{{t('map.configureHint')}}</p><button v-if="status==='error'" class="primary" @click="initialize">{{t('map.retry')}}</button></div>
    <div v-if="status==='ready'&&cityState==='loading'" class="map-city-status" role="status">{{t('map.cityLoading')}}</div>
    <div v-if="status==='ready'&&cityState==='error'" class="map-city-status error" role="alert">{{t('map.cityError')}} <button @click="locateCity">{{t('map.cityConfirm')}}</button></div>
    <div v-if="marking&&status==='ready'" class="marking-hint" role="status">{{t('map.markHint')}}</div>
    <div v-if="popupPlace&&status==='ready'&&!marking" class="map-place-popup"><button class="popup-close" :aria-label="t('map.closePreview')" @click="closePreview">×</button><small>{{t('map.preview')}}</small><h3>{{popupPlace.name}}</h3><p>{{popupPlace.address||t('map.addressUnknown')}}</p><button class="primary" :disabled="places.some(p=>p.id===popupPlace.id)" @click="$emit('add',popupPlace)">{{t(places.some(p=>p.id===popupPlace.id)?'map.added':'map.add')}}</button></div>
  </div><div class="real-map-caption"><span><i class="tiny-dot"/> {{t('map.routeLabel')}}</span><span v-if="cityState==='ready'">{{t('map.cityResolved',{city:resolvedName})}}</span></div>
</section></template>
