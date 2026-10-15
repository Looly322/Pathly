<script setup>
import {ref,computed,watch,onBeforeUnmount} from 'vue';
import {t} from '../i18n';
import {getWeather,forecastForDate,weatherKind,weatherWarnings} from '../services/weatherService';
const props=defineProps({destination:Object,dates:{type:Array,default:()=>[]}});
const emit=defineEmits(['update']);
const data=ref(null),status=ref('loading');let version=0;
const icons={clear:'☀',partly:'⛅',cloudy:'☁',fog:'≋',drizzle:'☂',rain:'☂',snow:'❄',storm:'ϟ',unknown:'—'};
const number=n=>typeof n==='number'&&Number.isFinite(n)?Math.round(n):'—';
const rows=computed(()=>props.dates.map(date=>({date,day:forecastForDate(data.value,date)})));
async function load(){
 const run=++version;data.value=null;status.value='loading';emit('update',{status:'loading',data:null});
 try{const result=await getWeather(props.destination);if(run===version){data.value=result;status.value='ready';emit('update',{status:'ready',data:result});}}
 catch{if(run===version){status.value='error';emit('update',{status:'error',data:null});}}
}
watch(()=>[props.destination.latitude,props.destination.longitude,props.destination.coordinateSystem,props.dates.join('|')].join(':'),load,{immediate:true});
onBeforeUnmount(()=>version++);
</script>
<template><section class="weather-panel" :aria-label="t('weather.title')" :aria-busy="status==='loading'">
<div class="weather-header"><strong>{{t('weather.title')}}</strong><button v-if="status==='ready'" class="text-button weather-refresh" @click="load">{{t('weather.reassess')}}</button><template v-if="data"><span class="weather-current"><span aria-hidden="true">{{icons[weatherKind(data.current?.weather_code)]}}</span> {{t('weather.now')}} {{number(data.current?.temperature_2m)}} °C · {{t('weather.'+weatherKind(data.current?.weather_code))}} · {{t('weather.wind')}} {{number(data.current?.wind_speed_10m)}} km/h</span><small>{{data.current?.time?.replace('T',' ')}} · {{data.timezone}} · {{t('weather.local')}}</small></template></div>
<p v-if="status==='loading'" role="status">{{t('weather.loading')}}</p><p v-else-if="status==='error'" role="status">{{t('weather.unavailable')}} <button class="text-button" @click="load">{{t('weather.retry')}}</button></p>
<template v-else><div class="weather-days"><div v-for="row in rows" :key="row.date" class="weather-day"><time>{{row.date}}</time><template v-if="row.day"><span><span aria-hidden="true">{{icons[weatherKind(row.day.code)]}}</span> {{t('weather.'+weatherKind(row.day.code))}}</span><span>{{t('weather.high')}} {{number(row.day.high)}}° / {{t('weather.low')}} {{number(row.day.low)}}°</span><small>{{t('weather.precipChance')}} {{number(row.day.rain)}}{{row.day.rain==null?'':'%'}}</small><small v-for="warning in weatherWarnings(row.day)" :key="warning" class="weather-warning">{{t('weather.'+warning)}}</small></template><small v-else>{{t('weather.noForecast')}}</small></div></div><footer><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · {{t('weather.model')}}</footer></template>
</section></template>
<style scoped>
.weather-panel{border:1px solid var(--border);border-radius:12px;margin:18px 0;padding:14px 16px;font-size:13px}.weather-header{display:flex;gap:8px 18px;flex-wrap:wrap;align-items:center}.weather-header small{color:var(--text-secondary);font-size:11px}.weather-current{font-weight:500}.weather-days{display:flex;gap:12px;overflow-x:auto;margin:12px 0}.weather-day{display:flex;flex-direction:column;gap:4px;min-width:165px;padding:0 12px 0 0;border-right:1px solid var(--border);flex:1}.weather-day time{font-weight:600}.weather-day small,footer{font-size:11px;color:var(--text-secondary)}.weather-warning{color:var(--primary)!important}.weather-panel p{margin:8px 0}.weather-panel footer{line-height:1.5}@media(max-width:540px){.weather-current{font-size:12px}.weather-panel{padding:12px}}
</style>
