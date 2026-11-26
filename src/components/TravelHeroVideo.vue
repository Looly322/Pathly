<script setup>
import {ref,onMounted,onUnmounted,watch} from 'vue';
const props=defineProps({paused:Boolean});
const emit=defineEmits(['availability']);
const video=ref(null),eligible=ref(false),ready=ref(false),failed=ref(false);
let policy,observer,timer,visible=true;
function stopTimer(){clearTimeout(timer);}
function fail(){stopTimer();failed.value=true;ready.value=false;video.value?.pause();emit('availability',false);}
function pending(){stopTimer();timer=setTimeout(fail,12000);}
function playing(){stopTimer();ready.value=true;emit('availability',true);}
function playback(){
 const el=video.value;if(!el)return;
 if(props.paused||!visible||document.hidden){el.pause();stopTimer();}
 else if(eligible.value&&!failed.value){pending();el.play().catch(error=>{if(error.name!=='AbortError')fail();});}
}
function updatePolicy(){eligible.value=policy.matches&&!navigator.connection?.saveData;failed.value=false;ready.value=false;stopTimer();emit('availability',eligible.value);}
watch(()=>props.paused,playback);
watch(eligible,()=>{if(eligible.value)pending();});
onMounted(()=>{policy=matchMedia('(min-width: 701px) and (prefers-reduced-motion: no-preference)');updatePolicy();policy.addEventListener('change',updatePolicy);document.addEventListener('visibilitychange',playback);observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;playback();});observer.observe(video.value?.parentElement||document.querySelector('.hero-parallax'));});
onUnmounted(()=>{stopTimer();policy?.removeEventListener('change',updatePolicy);document.removeEventListener('visibilitychange',playback);observer?.disconnect();});
</script>
<template><div class="travel-video" :class="{ready}" aria-hidden="true"><video v-if="eligible&&!failed" ref="video" src="/videos/home/mountain-lake.mp4" poster="/images/home/video-poster.webp" autoplay muted loop playsinline preload="none" @loadeddata="playback" @playing="playing" @waiting="pending" @error="fail"/></div></template>
<style scoped>.travel-video{position:absolute;inset:0;opacity:0;transition:opacity 1.2s ease;pointer-events:none}.travel-video.ready{opacity:1}.travel-video video{width:100%;height:100%;object-fit:cover}@media(prefers-reduced-motion:reduce){.travel-video{display:none}}</style>
