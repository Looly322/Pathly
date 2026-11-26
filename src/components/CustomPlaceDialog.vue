<script setup>
import { ref } from 'vue';
import { t } from '../i18n';
import { hasValidCoordinates } from '../utils/geo.js';
import ModalShell from './ModalShell.vue';
const props=defineProps({point:Object,city:String});const emit=defineEmits(['close','save']);
const name=ref(t('map.customDefault')),stay=ref(60),locked=ref(false),error=ref('');
function save(){if(!name.value.trim()){error.value='map.nameRequired';return}if(!hasValidCoordinates(props.point)){error.value='map.invalidCoordinates';return}
  emit('save',{id:`custom-${crypto.randomUUID()}`,poiId:null,name:name.value.trim(),city:props.city,category:'custom',address:'',...props.point,source:'custom',userAdded:true,locked:locked.value,estimatedStay:stay.value});
}
</script>
<template><ModalShell :title="t('map.customTitle')" @close="emit('close')"><form class="custom-place-form" @submit.prevent="save"><label class="field">{{t('map.customName')}}<input v-model="name" required maxlength="100" autofocus></label><small>{{t('map.coordinates')}} {{point.longitude.toFixed(5)}}, {{point.latitude.toFixed(5)}}</small><fieldset><legend>{{t('map.duration')}}</legend><div class="chips"><button v-for="minutes in [30,60,90,120]" :key="minutes" type="button" class="chip" :class="{selected:stay===minutes}" :aria-pressed="stay===minutes" @click="stay=minutes">{{minutes}} {{t('minutes')}}</button></div></fieldset><label class="must-visit-check"><input type="checkbox" v-model="locked">{{t('map.mustVisit')}}</label><p v-if="error" role="alert" class="error">{{t(error)}}</p><div class="custom-dialog-actions"><button type="button" class="outline" @click="emit('close')">{{t('map.cancel')}}</button><button class="primary">{{t('map.customSave')}}</button></div></form></ModalShell></template>
