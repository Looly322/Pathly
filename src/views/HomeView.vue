<script setup>
import {reactive,ref} from 'vue';
import {t,language} from '../i18n';
import BrandLogo from '../components/BrandLogo.vue';
import CitySearch from '../components/CitySearch.vue';
import PreferenceSelector from '../components/PreferenceSelector.vue';
const props=defineProps({initial:Object,selectedCity:String,busy:Boolean,searchError:String,progress:String});
const emit=defineEmits(['generate','open-map','cancel','update:selectedCity']);
const today=new Date();today.setMinutes(today.getMinutes()-today.getTimezoneOffset());
const form=reactive({...{selectedCity:props.selectedCity||'',date:today.toISOString().slice(0,10),days:3,party:'solo',start:'09:00',end:'20:00',budget:500,interests:['CULTURE','FOOD'],pace:'balanced',walking:'medium',wishlist:[],mustPlaces:[]},...props.initial});
const wish=ref(''),error=ref(false);
function addWish(){const name=wish.value.trim();if(name&&!form.wishlist.includes(name))form.wishlist.push(name);wish.value='';}
function payload(){return JSON.parse(JSON.stringify({...form,selectedCity:form.selectedCity.trim()}));}
function valid(){return form.selectedCity.trim()&&form.date&&form.days>=1&&form.days<=14&&form.start<form.end&&Number.isFinite(form.budget)&&form.budget>=0;}
function submit(){error.value=!valid();if(!error.value)emit('generate',payload());}
function openMap(){error.value=!valid();if(!error.value)emit('open-map',payload());}
</script>
<template><main class="home-layout"><aside class="brand-panel"><div class="brand-panel-top"><BrandLogo/><span class="edition">TRAVEL, THOUGHTFULLY.</span></div><div class="brand-story"><div class="eyebrow">{{t('eyebrow')}}</div><h1 :class="{english:language==='en'}">{{t('headline')}}</h1><p>{{t('planner.intro')}}</p><ul class="feature-list"><li v-for="(text,i) in t('planner.features')" :key="text"><span class="feature-icon">{{['↗','◷','♡'][i]}}</span>{{text}}</li></ul></div><div class="brand-bottom">{{t('footer')}}</div></aside>
<section class="form-panel"><form @submit.prevent="submit"><div class="form-heading"><span class="section-kicker">PATHLY / YOUR NEXT JOURNEY</span><h2>{{t('where')}}</h2><p>{{t('planner.flow')}}</p></div>
<CitySearch v-model="form.selectedCity" @update:model-value="emit('update:selectedCity',$event)"/>
<div class="form-section date-grid"><label class="field">{{t('date')}}<input type="date" v-model="form.date" required/></label><label class="field">{{t('planner.days')}}<input type="number" min="1" max="14" v-model.number="form.days" required/></label><label class="field">{{t('planner.party')}}<select v-model="form.party"><option v-for="(label,id) in t('planner.parties')" :value="id" :key="id">{{label}}</option></select></label></div>
<div class="form-section date-grid"><label class="field">{{t('start')}}<input type="time" v-model="form.start" required/></label><label class="field">{{t('end')}}<input type="time" v-model="form.end" required/></label></div>
<div class="form-section"><div class="label-row">{{t('interests')}}</div><PreferenceSelector v-model="form.interests" :options="t('planner.interests')"/></div>
<div class="form-section"><div class="label-row">{{t('planner.pace')}}</div><div class="pace-options"><button v-for="(label,id) in t('planner.paces')" :key="id" type="button" class="chip" :class="{selected:form.pace===id}" :aria-pressed="form.pace===id" @click="form.pace=id"><strong>{{label}}</strong><small>{{t('planner.paceHints.'+id)}}</small></button></div></div>
<div class="form-section walking-row"><span>{{t('walking')}}</span><div class="segmented"><button type="button" v-for="id in ['low','medium','high']" :key="id" :class="{selected:form.walking===id}" :aria-pressed="form.walking===id" @click="form.walking=id">{{t(id)}}</button></div></div>
<div class="form-section"><label class="field">{{t('planner.dailyBudget')}}<input type="number" min="0" max="100000" v-model.number="form.budget" required/></label><small>{{t('planner.budgetHint')}}</small></div>
<div class="wishlist-section"><div class="label-row">{{t('planner.mustOptional')}}</div><p>{{t('planner.mustHint')}}</p><div class="wish-input"><input v-model="wish" :aria-label="t('planner.mustName')" :placeholder="t('planner.mustName')" @keydown.enter.prevent="addWish"/><button type="button" @click="addWish" :disabled="!wish.trim()">{{t('add')}}</button></div><div class="wish-tags"><span v-for="name in form.wishlist" :key="name">{{name}}<button type="button" @click="form.wishlist=form.wishlist.filter(n=>n!==name)" :aria-label="t('remove')+name">×</button></span><span v-for="place in form.mustPlaces" :key="place.id">{{place.name}}<button type="button" @click="form.mustPlaces=form.mustPlaces.filter(p=>p.id!==place.id)" :aria-label="t('remove')+place.name">×</button></span></div><button class="outline" type="button" @click="openMap" :disabled="busy">⌖ {{t('planner.addMust')}}</button></div>
<p v-if="error" class="error" role="alert">{{t('invalid')}}</p><p v-if="searchError" class="error" role="alert">{{t(searchError)}}</p><p v-if="busy" role="status">{{t('planner.loading')}} {{progress}}</p><button v-if="busy" type="button" class="outline" @click="emit('cancel')">{{t('livePlan.cancel')}}</button><button class="primary generate" :disabled="busy">{{t('generate')}} ↗</button><p class="form-footnote">{{t('planner.honest')}}</p>
</form></section></main></template>
<style scoped>.pace-options{display:flex;gap:8px;flex-wrap:wrap}.pace-options button{display:grid;gap:6px;text-align:left}.pace-options small{font-size:11px;font-weight:400}.field select{min-width:0;width:100%}.wishlist-section .outline{margin-top:12px}</style>
