<script setup>
import {ref,onMounted,onUnmounted} from 'vue';
import {language} from '../i18n';
const emit=defineEmits(['state','complete']);
const active=ref(false),leaving=ref(false),skip=ref(null);
const key='pathly:intro:v1';let leaveTimer,endTimer,media,done=false,previousFocus;
// Original single-line letter paths, drawn for Pathly; not font-outline tracing.
const strokes=[
 'M45 178 C73 154 86 76 108 51 C122 35 160 38 160 62 C160 85 131 109 108 105 C89 101 95 87 110 84 M94 88 C86 121 80 159 64 182',
 'M172 124 C158 106 139 125 134 145 C128 168 146 171 159 147 L174 120 C167 139 159 164 173 162 C181 160 187 154 192 148',
 'M191 151 C210 123 235 75 234 65 C232 54 218 78 210 101 C198 132 196 161 209 163 C219 165 231 152 237 144 M191 112 C207 110 226 107 242 108',
 'M235 155 C252 123 276 57 267 51 C256 43 234 119 237 156 C246 135 259 118 267 123 C275 128 256 153 264 160 C270 167 283 154 289 146',
 'M286 150 C305 127 329 63 317 53 C306 44 285 119 290 149 C293 169 309 157 322 145',
 'M324 124 C316 141 311 158 325 159 C337 158 346 137 353 121 C344 149 340 182 325 203 C309 226 288 217 303 200 C316 186 346 174 369 148'
];
function complete(){if(done)return;done=true;window.removeEventListener('keydown',keyboard,true);clearTimeout(leaveTimer);clearTimeout(endTimer);active.value=false;emit('state',false);emit('complete');if(document.activeElement===skip.value)previousFocus?.focus?.({preventScroll:true});}
function exit(){leaving.value=true;clearTimeout(leaveTimer);clearTimeout(endTimer);endTimer=setTimeout(complete,550);}
function keyboard(e){if(!active.value)return;if(e.key==='Escape'){e.preventDefault();complete();}else if(e.key==='Tab'){e.preventDefault();skip.value?.focus();}}
function preference(){if(media.matches)complete();}
onMounted(()=>{
 previousFocus=document.activeElement;media=matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',preference);
 let seen=false;try{seen=sessionStorage.getItem(key)==='seen';sessionStorage.setItem(key,'seen');}catch{/* Storage unavailable: play once for this component mount. */}
 if(seen||media.matches){complete();return;}
 active.value=true;emit('state',true);window.addEventListener('keydown',keyboard,true);
 leaveTimer=setTimeout(exit,2300);endTimer=setTimeout(complete,3200);
});
onUnmounted(()=>{clearTimeout(leaveTimer);clearTimeout(endTimer);window.removeEventListener('keydown',keyboard,true);media?.removeEventListener('change',preference);});
</script>
<template><div v-if="active" class="brand-intro" :class="{leaving}" role="dialog" aria-modal="true" :aria-label="language==='zh'?'Pathly 开场':'Pathly introduction'"><button ref="skip" class="intro-skip" @click="complete">{{language==='zh'?'跳过开场':'Skip intro'}} ↗</button><svg viewBox="25 25 365 210" class="intro-signature" role="img" aria-label="Pathly"><path v-for="(d,i) in strokes" :key="i" :d="d" pathLength="1" :style="{'--delay':i*.23+'s'}"/></svg></div></template>
<style scoped>
.brand-intro{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#f6f3eb;color:#29453a;opacity:1;transition:opacity .55s ease;touch-action:none}.brand-intro.leaving{opacity:0}.intro-signature{width:min(460px,72vw);height:auto;overflow:visible}.intro-signature path{fill:none;stroke:currentColor;stroke-width:2.7;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:write-letter .65s cubic-bezier(.3,.1,.3,1) var(--delay) forwards}.intro-skip{position:absolute;right:6vw;top:40px;font-size:12px;letter-spacing:.1em;border-bottom:1px solid #29453a55;padding:8px;color:inherit}.intro-skip:focus-visible{outline:2px solid #29453a;outline-offset:5px}@keyframes write-letter{to{stroke-dashoffset:0}}@media(prefers-reduced-motion:reduce){.brand-intro{display:none}}
</style>
