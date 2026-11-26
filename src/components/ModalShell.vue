<script setup>
import { ref,onMounted,onUnmounted } from 'vue'
import { t } from '../i18n'
defineProps({title:String});const emit=defineEmits(['close']);const dialog=ref(null)
let previous
function keys(e){if(e.key==='Escape')emit('close');if(e.key==='Tab'){const focus=[...dialog.value.querySelectorAll('button,input,[tabindex="0"]')];const first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}
onMounted(()=>{previous=document.activeElement;dialog.value.focus();document.body.style.overflow='hidden';document.addEventListener('keydown',keys)})
onUnmounted(()=>{document.body.style.overflow='';document.removeEventListener('keydown',keys);previous?.focus()})
</script>
<template><Teleport to="body"><div class="modal-backdrop" @click.self="emit('close')"><section ref="dialog" class="modal" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1"><div class="modal-header"><h2>{{title}}</h2><button @click="emit('close')" :aria-label="t('close')">×</button></div><slot/></section></div></Teleport></template>
