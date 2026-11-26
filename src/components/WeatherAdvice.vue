<script setup>
import {computed,ref,watch} from 'vue';
import {t} from '../i18n';
import {placeName} from '../utils/globalLabels';
import {clock} from '../planner/planner';
import {optimizeWeather} from '../planner/weatherOptimizer';
const props=defineProps({plan:Object,settings:Object,weather:Object,assessment:Object});
const emit=defineEmits(['apply']);
const proposal=ref(null),message=ref(''),ack=ref(false);
const signature=computed(()=>JSON.stringify([props.plan,props.settings,props.weather]));
let proposedAgainst='';
watch(signature,()=>{proposal.value=null;ack.value=false;message.value='';});
function optimize(){
 const result=optimizeWeather(props.plan,props.settings,props.weather.data);ack.value=false;proposal.value=result.plan?result:null;message.value=result.reason||'';proposedAgainst=signature.value;
}
function keep(){proposal.value=null;message.value='kept';}
function apply(){if(!proposal.value||proposedAgainst!==signature.value||proposal.value.unknownHours.length&&!ack.value)return;emit('apply',proposal.value.plan);proposal.value=null;}
const missingNames=computed(()=>proposal.value?.unknownHours.map(id=>{const p=props.plan.days.flatMap(d=>d.events).find(e=>e.place?.id===id)?.place;return p?placeName(p):id;}).join(' / '));
const supportChanges=computed(()=>proposal.value?props.plan.days.flatMap((d,i)=>d.events.filter(e=>e.kind!=='ACTIVITY').flatMap(e=>{const next=proposal.value.plan.days[i].events.find(n=>n.id===e.id);return next&&(next.start!==e.start||next.end!==e.end)?[{date:d.date,kind:e.kind,before:e,after:next}]:[]})):[]);
</script>
<template><section class="weather-advice" :aria-label="t('weatherAdvice.title')"><strong>{{t('weatherAdvice.title')}}</strong>
<p role="status">{{t('weatherAdvice.'+(!assessment.complete?'missing':assessment.affected.length?'risk':'calm'))}}</p>
<div class="weather-advice-actions"><button class="outline" @click="keep">{{t('weatherAdvice.keep')}}</button><button class="primary" :disabled="!assessment.complete||!assessment.affected.length" @click="optimize">{{t('weatherAdvice.optimize')}}</button></div>
<p v-if="message" role="status">{{t('weatherAdvice.'+message)}}</p>
<div v-if="proposal" class="weather-preview"><h3>{{t('weatherAdvice.preview')}}</h3><ul><li v-for="change in proposal.changes" :key="change.id"><strong>{{placeName(change.place)}}</strong><div>{{t('weatherAdvice.before')}}：{{change.before.date}} · {{change.before.index+1}} · {{clock(change.before.event.start)}}–{{clock(change.before.event.end)}}</div><div>{{t('weatherAdvice.after')}}：{{change.after.date}} · {{change.after.index+1}} · {{clock(change.after.event.start)}}–{{clock(change.after.event.end)}}</div></li></ul>
<details v-if="supportChanges.length"><summary>{{t('weatherAdvice.support')}}</summary><p v-for="(change,i) in supportChanges" :key="i">{{change.date}} · {{t('weatherAdvice.'+(change.kind==='MEAL'?'meal':'rest'))}}：{{clock(change.before.start)}}–{{clock(change.before.end)}} → {{clock(change.after.start)}}–{{clock(change.after.end)}}</p></details>
<p>{{t('weatherAdvice.schedule')}}</p><p v-if="proposal.unknownHours.length">{{t('weatherAdvice.hours',{names:missingNames})}}</p><label v-if="proposal.unknownHours.length"><input type="checkbox" v-model="ack"/> {{t('weatherAdvice.ack')}}</label>
<div class="weather-advice-actions"><button class="outline" @click="proposal=null">{{t('weatherAdvice.cancel')}}</button><button class="primary" :disabled="proposal.unknownHours.length>0&&!ack" @click="apply">{{t('weatherAdvice.apply')}}</button></div></div><small>{{t('weatherAdvice.uncertain')}}</small></section></template>
<style scoped>.weather-advice{border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin:14px 0;font-size:13px}.weather-advice p{margin:8px 0;line-height:1.6}.weather-advice small{display:block;color:var(--text-secondary);margin-top:10px;line-height:1.5}.weather-advice-actions{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}.weather-advice-actions button{font-size:12px;padding:9px 12px}.weather-preview{border-top:1px solid var(--border);margin-top:12px}.weather-preview li{margin:10px 0;line-height:1.7}.weather-preview label{display:flex;align-items:start;gap:7px}.weather-preview input{width:auto;margin-top:3px}.weather-preview h3{font-size:15px}</style>
