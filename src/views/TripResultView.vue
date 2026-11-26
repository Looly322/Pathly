<script setup>
import {computed,ref} from 'vue';
import {t,language} from '../i18n';
import {generateItineraries,scheduleDay,clock,mealWindows} from '../planner/planner';
import UnifiedTripMap from '../components/UnifiedTripMap.vue';
import ActivityImage from '../components/ActivityImage.vue';
const props=defineProps({settings:Object,destination:Object,places:Array,limited:Boolean,pending:Array});
defineEmits(['back']);
const settings=ref({...props.settings,mustIds:[...(props.settings.mustIds||[])]});
const variants=ref(generateItineraries(props.places,settings.value)),pace=ref(props.settings.pace),dayIndex=ref(0),active=ref(''),history=ref([]),notice=ref(''),comparison=ref(false);
const current=computed(()=>variants.value.find(p=>p.id===pace.value));
const day=computed(()=>current.value.days[dayIndex.value]);
const mapPlaces=computed(()=>day.value.events.filter(e=>e.place).map(e=>e.place));
const displayName=computed(()=>language.value==='zh'?props.destination.displayName:props.destination.canonicalName);
const missing=computed(()=>settings.value.interests.filter(i=>!props.places.some(p=>p.subcategories.includes(i))));
const nameFor=id=>props.places.find(p=>p.id===id)?.name||id;
function reason(event){
 if(event.reason==='interest')return t('planner.interestReason',{interests:event.matches.map(i=>t('planner.interests.'+i)).join(' / ')});
 return t('planner.'+({foodMeal:'foodReason',meal:'mealReason',rest:'restReason',must:'mustReason',nearby:'nearbyReason'}[event.reason]));
}
function title(event){return event.place?.name||t('planner.'+(event.kind==='REST'?'rest':event.slot==='LUNCH'?(settings.value.interests.includes('FOOD')?'foodLunch':'lunch'):(settings.value.interests.includes('FOOD')?'foodDinner':'dinner')));}
function snapshot(){history.value.push(JSON.stringify({variants:variants.value,settings:settings.value}));notice.value='';}
function undo(){const h=history.value.pop();if(h){const data=JSON.parse(h);variants.value=data.variants;settings.value=data.settings;}}
function replan(){snapshot();variants.value=generateItineraries(props.places,settings.value);}
function toggleLock(id){snapshot();const ids=settings.value.mustIds;settings.value.mustIds=ids.includes(id)?ids.filter(v=>v!==id):[...ids,id];variants.value=generateItineraries(props.places,settings.value);}
function edit(event,action){
 const items=day.value.items.map(i=>({...i}));const index=items.findIndex(i=>i.place.id===event.id);
 if(index<0)return;
 const locked=settings.value.mustIds.includes(event.id);
 if(locked&&['remove','replace'].includes(action))return;
 snapshot();
 if(action==='remove')items.splice(index,1);
 if(action==='longer'||action==='shorter')items[index].duration=Math.max(items[index].place.minimumDuration,event.duration+(action==='longer'?15:-15));
 if(action==='up'&&index>0)[items[index-1],items[index]]=[items[index],items[index-1]];
 if(action==='down'&&index<items.length-1)[items[index+1],items[index]]=[items[index],items[index+1]];
 if(action==='replace'){
  const used=new Set(current.value.days.flatMap(d=>d.events.filter(e=>e.place).map(e=>e.place.id)));
  const alternative=props.places.find(p=>p.category===event.place.category&&!used.has(p.id));
  if(!alternative){notice.value='planner.noReplacement';return;}items[index]={place:alternative};
 }
 const usedOther=new Set(current.value.days.filter((_,i)=>i!==dayIndex.value).flatMap(d=>d.events.filter(e=>e.place).map(e=>e.place.id)));
 const schedule=scheduleDay(items,settings.value,pace.value,props.places.filter(p=>p.category==='FOOD'&&!usedOther.has(p.id)));
 Object.assign(day.value,schedule);
}
function select(id){active.value=id;document.getElementById('event-'+id)?.scrollIntoView({behavior:'smooth',block:'center'});}
</script>
<template><main class="trip-result"><button class="text-button" @click="$emit('back')">← {{t('planner.back')}}</button><div class="trip-heading"><div><span class="section-kicker">PATHLY / DAY BY DAY</span><h1>{{t('planner.title',{city:displayName,days:settings.days})}}</h1><p>{{settings.date}} · {{t('planner.parties.'+settings.party)}} · {{settings.interests.map(i=>t('planner.interests.'+i)).join(' / ')}}</p></div><div class="trip-actions"><button class="outline" @click="comparison=!comparison">{{t('planner.compare')}}</button><button class="primary" @click="replan">{{t('planner.replan')}}</button></div></div>
<p class="data-notice" v-if="limited">{{t('planner.snapshot')}}</p><p class="error" v-if="!places.length">{{t('planner.empty')}}</p><p class="data-notice" v-if="pending.length">{{t('planner.pending')}} {{pending.join(' / ')}}</p><p class="data-notice" v-if="missing.length">{{t('planner.missingInterest')}} {{missing.map(i=>t('planner.interests.'+i)).join(' / ')}}</p>
<div class="trip-paces"><button v-for="plan in variants" :key="plan.id" :class="{selected:pace===plan.id}" :aria-pressed="pace===plan.id" @click="pace=plan.id;active=''">{{t('planner.paces.'+plan.id)}}<small>{{t('planner.paceHints.'+plan.id)}}</small></button></div>
<div v-if="comparison" class="comparison-scroll"><table><thead><tr><th>{{t('planner.pace')}}</th><th>{{t('planner.activities')}}</th><th>{{t('planner.fatigue')}}</th><th>{{t('planner.reserve')}}</th></tr></thead><tbody><tr v-for="plan in variants" :key="plan.id"><td>{{t('planner.paces.'+plan.id)}}</td><td>{{plan.days.reduce((s,d)=>s+d.fatigue.activities,0)}}</td><td>{{Math.round(plan.days.reduce((s,d)=>s+d.fatigue.score,0)/plan.days.length)}} / 100</td><td>¥{{plan.days.reduce((s,d)=>s+d.knownCost+d.reserve,0)}}</td></tr></tbody></table></div>
<p class="error" v-if="current.unplacedMust.length">{{t('planner.unplaced')}} {{current.unplacedMust.map(nameFor).join(' / ')}}</p>
<nav class="trip-days"><button v-for="(d,i) in current.days" :key="d.day" :aria-pressed="dayIndex===i" :class="{selected:dayIndex===i}" @click="dayIndex=i;active=''">{{t('planner.day',{n:d.day})}}<small>{{d.date}}</small></button></nav>
<div class="trip-stats"><div><small>{{t('planner.activities')}}</small><strong>{{day.fatigue.activities}}</strong></div><div><small>{{t('planner.fatigue')}}</small><strong>{{day.fatigue.score}}<small> / 100</small></strong></div><div><small>{{t('planner.stability')}}</small><strong>{{day.stability}}<small> / 100</small></strong></div><div><small>{{t('planner.reserve')}}</small><strong>¥{{day.knownCost+day.reserve}}</strong></div></div>
<p class="estimate-note">{{t('planner.estimate')}} {{t('planner.unknownPrice')}}</p>
<div class="day-layout"><aside><UnifiedTripMap :key="destination.id" :destination="destination" :places="mapPlaces" :active="active" @select="select"/><p>{{t('planner.free',{n:day.free})}} · {{day.fatigue.walking}} km · {{t('planner.travel',{n:day.fatigue.travel})}}</p></aside><section class="daily-timeline"><div class="timeline-heading"><h2>{{t('planner.day',{n:day.day})}}</h2><button class="text-button" :disabled="!history.length" @click="undo">↶ {{t('planner.undo')}}</button></div><p v-if="notice" role="status">{{t(notice)}}</p><p v-if="day.conflicts.length" class="error" role="alert">{{t('planner.conflict')}} {{day.conflicts.map(c=>t('planner.conflicts.'+c)).join(' / ')}}</p><p v-if="day.fatigue.activities<2" class="data-notice">{{t('planner.limited')}}</p><p v-if="!mealWindows(settings).length" class="data-notice">{{t('planner.noMealWindow')}}</p>
<article v-for="event in day.events" :key="event.id" :id="'event-'+event.id" class="trip-event" :class="{selected:active===event.id,'support-event':event.kind!=='ACTIVITY'}"><p class="event-time">{{clock(event.start)}} — {{clock(event.end)}}<span>{{t('planner.stay',{n:event.duration})}}</span></p><div class="event-body" @click="event.place&&(active=event.id)"><ActivityImage v-if="event.place" :place="event.place"/><div><small>{{t('planner.types.'+event.activityType)}}</small><h3>{{title(event)}}</h3><p>{{reason(event)}}</p><p v-if="event.travel.minutes">↳ {{t('planner.travel',{n:event.travel.minutes})}}</p><small v-if="event.kind==='MEAL'&&!event.place">{{t('planner.unmatchedFood')}}</small></div></div><div v-if="event.kind==='ACTIVITY'" class="event-controls"><button class="outline" @click="edit(event,'shorter')">−15</button><button class="outline" @click="edit(event,'longer')">+15</button><button class="text-button" @click="edit(event,'up')">{{t('planner.up')}}</button><button class="text-button" @click="edit(event,'down')">{{t('planner.down')}}</button><button class="text-button" :disabled="settings.mustIds.includes(event.id)" @click="edit(event,'replace')">{{t('planner.replace')}}</button><button class="text-button" @click="toggleLock(event.id)">{{t(settings.mustIds.includes(event.id)?'planner.unlock':'planner.lock')}}</button><button class="text-button" :disabled="settings.mustIds.includes(event.id)" @click="edit(event,'remove')">{{t('planner.remove')}}</button></div></article>
</section></div></main></template>
<style scoped>
.trip-result{max-width:1400px;padding:30px 3%;margin:auto}.trip-heading{display:flex;justify-content:space-between;gap:20px;align-items:center;margin:22px 0}.trip-heading h1{font-size:34px;margin:10px 0}.trip-heading p,.estimate-note{color:var(--text-secondary);font-size:13px}.trip-actions{display:flex;gap:10px}.data-notice{background:var(--primary-soft);padding:12px 16px;border-radius:8px;font-size:13px;line-height:1.7}.trip-paces{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:22px 0}.trip-paces button,.trip-days button{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px;text-align:left}.trip-paces small,.trip-days small{display:block;margin-top:6px;font-size:12px;color:var(--text-secondary)}.trip-days{display:flex;gap:10px;overflow:auto;margin:22px 0}.trip-days button{flex-shrink:0;padding:12px 20px}.selected{border-color:var(--primary)!important;background:var(--primary-soft)!important}.trip-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.trip-stats>div{border-right:1px solid var(--border)}.trip-stats strong{display:block;font-size:28px;padding-top:8px}.trip-stats small{font-size:12px;color:var(--text-secondary);font-weight:normal}.day-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:26px;align-items:start;margin-top:24px}.day-layout aside{position:sticky;top:12px;min-width:0}.day-layout aside>p{font-size:12px;color:var(--text-secondary)}.day-layout :deep(.world-map){margin:0}.timeline-heading{display:flex;justify-content:space-between;align-items:center}.trip-event{border:1px solid var(--border);border-radius:14px;margin-bottom:18px;overflow:hidden;scroll-margin-top:15px}.event-time{padding:14px 16px;border-bottom:1px solid var(--border);margin:0;font-weight:600}.event-time span{float:right;color:var(--text-secondary);font-size:12px;font-weight:400}.event-body{display:flex;gap:16px;padding:16px;overflow-wrap:anywhere}.event-body h3{margin:6px 0;font-size:18px}.event-body p,.event-body small{font-size:12px;line-height:1.7;color:var(--text-secondary)}.event-controls{display:flex;gap:8px;padding:10px 14px;flex-wrap:wrap;border-top:1px solid var(--border)}.event-controls button{padding:6px;font-size:12px}.support-event{background:var(--primary-soft)}.comparison-scroll{overflow:auto}.comparison-scroll table{border-collapse:collapse;width:100%;font-size:13px}.comparison-scroll td,.comparison-scroll th{padding:14px;text-align:left;border-bottom:1px solid var(--border)}@media(max-width:760px){.day-layout{grid-template-columns:1fr}.day-layout aside{position:static}.trip-heading{flex-direction:column;align-items:start}.trip-heading h1{font-size:26px}.trip-paces{gap:6px}.trip-paces button{padding:12px 8px}.trip-stats{grid-template-columns:repeat(2,1fr)}.event-time span{float:none;display:block;margin-top:5px}.event-body{gap:10px}}
</style>
