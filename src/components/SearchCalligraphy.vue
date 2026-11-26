<script setup>
import {ref,onMounted,onBeforeUnmount} from 'vue';
const layer=ref(null),ready=ref(false);
let host,frame=0,probe,observer,enabled,disposed=false,active=false;
let target={x:0,y:0},position={x:0,y:0},pointer={x:0,y:0};
function tick(){
 frame=0;if(!active||disposed)return;
 const box=host.getBoundingClientRect();target={x:pointer.x-box.left,y:pointer.y-box.top};
 position.x+=(target.x-position.x)*.16;position.y+=(target.y-position.y)*.16;
 layer.value.style.setProperty('--ink-x',position.x+'px');layer.value.style.setProperty('--ink-y',position.y+'px');
 if(Math.abs(target.x-position.x)+Math.abs(target.y-position.y)>.2)frame=requestAnimationFrame(tick);
}
function move(e){
 if(!ready.value||!enabled.matches||e.pointerType==='touch')return;
 pointer={x:e.clientX,y:e.clientY};
 if(!active){const b=host.getBoundingClientRect();position={x:e.clientX-b.left,y:e.clientY-b.top};active=true;}
 layer.value.style.setProperty('--ink-visible','1');if(!frame)frame=requestAnimationFrame(tick);
}
function leave(){active=false;cancelAnimationFrame(frame);frame=0;layer.value?.style.setProperty('--ink-visible','0');}
function scroll(){if(active&&!frame)frame=requestAnimationFrame(tick);}
function preference(){if(!enabled.matches)leave();}
onMounted(()=>{
 host=layer.value.parentElement;enabled=matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
 probe=new Image();probe.onload=()=>{if(!disposed)ready.value=true;};probe.onerror=()=>{ready.value=false;leave();};observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){probe.src='/images/search/lantingxu-ink.webp';observer.disconnect();}},{rootMargin:'350px'});observer.observe(host);
 host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);
 window.addEventListener('scroll',scroll,{passive:true});enabled.addEventListener('change',preference);
});
onBeforeUnmount(()=>{disposed=true;leave();observer?.disconnect();if(probe)probe.onload=probe.onerror=null;host?.removeEventListener('pointermove',move);host?.removeEventListener('pointerleave',leave);window.removeEventListener('scroll',scroll);enabled?.removeEventListener('change',preference);});
</script>
<template><div ref="layer" class="search-calligraphy" :class="{'art-ready':ready}" aria-hidden="true"><div class="calligraphy-rest"></div><div class="calligraphy-reveal"></div></div></template>
<style scoped>
.search-calligraphy{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;--ink-visible:0;--ink-x:50%;--ink-y:50%}
.calligraphy-rest,.calligraphy-reveal{position:absolute;inset:0;background-position:center top;background-size:max(1400px,125%) auto;background-repeat:repeat-y;opacity:0;pointer-events:none}
.art-ready .calligraphy-rest,.art-ready .calligraphy-reveal{background-image:url('/images/search/lantingxu-ink.webp')}
.art-ready .calligraphy-rest{opacity:.008}
.art-ready .calligraphy-reveal{opacity:calc(var(--ink-visible)*.36);transition:opacity .65s ease;mask-image:radial-gradient(circle 230px at var(--ink-x) var(--ink-y),#000 0%,#000b 30%,#0004 60%,transparent 100%);-webkit-mask-image:radial-gradient(circle 230px at var(--ink-x) var(--ink-y),#000 0%,#000b 30%,#0004 60%,transparent 100%)}
@media(hover:none),(pointer:coarse),(prefers-reduced-motion:reduce){.calligraphy-reveal{display:none}}
</style>
