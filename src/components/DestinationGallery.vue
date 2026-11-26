<script setup>
import {ref,onMounted,onUnmounted} from 'vue';
import EditorialPhoto from './EditorialPhoto.vue';
import {language} from '../i18n';
defineProps({destinations:Array,busy:Boolean,chooseLabel:String});
const emit=defineEmits(['choose']);
const gallery=ref(null),width=ref(1200),progress=ref(0),opened=ref(false);
const photos={beijing:'bright-palace',tokyo:'tokyo',paris:'dest-paris',rome:'dest-rome',kyoto:'kyoto',london:'dest-london',shanghai:'bright-shanghai',bali:'dest-bali'};
let frame=0,last=0,resize,motion;
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n)};
function tick(now){const dt=last?Math.min(now-last,40):16;last=now;progress.value=clamp(progress.value+(opened.value?1:-1)*dt/1400);if(progress.value!==(opened.value?1:0))frame=requestAnimationFrame(tick);else{frame=0;last=0;}}
function setOpen(value){opened.value=value;if(motion?.matches){progress.value=value?1:0;cancelAnimationFrame(frame);frame=0;return;}if(!frame)frame=requestAnimationFrame(tick);}
function leave(e){if(e.pointerType==='mouse'&&!gallery.value.contains(document.activeElement))setOpen(false);}
function blur(e){if(!gallery.value.contains(e.relatedTarget))setOpen(false);}
function style(i){
 const p=progress.value,small=width.value<650,w=width.value;
 const fan=ease((p*1400-300-i*25)/325),bloom=ease((p*1400-800-i*20)/460);
 const xs=[-.36,-.12,.12,.36,-.35,-.115,.13,.355],ys=[-175,-195,-180,-165,145,165,155,150],angles=[-7,5,-4,8,5,-6,7,-5];
 const finalX=small?(i%2?1:-1)*w*.245:xs[i]*w;
 const finalY=small?Math.floor(i/2)*225-335:ys[i];
 const fx=(i-3.5)*(small?18:38),fy=-85-Math.sin(i/7*Math.PI)*90;
 const startX=(i%3-1)*12,startY=-35-(i%3)*12;
 const x=startX+(fx-startX)*fan+(finalX-fx)*bloom,y=startY+(fy-startY)*fan+(finalY-fy)*bloom;
 const rotation=(i%3-1)*5+((i-3.5)*8-(i%3-1)*5)*fan+(angles[i]-(i-3.5)*8)*bloom;
 const scale=.63+.22*fan+(.15+(small?0:(i%3-1)*.035))*bloom;
 return {transform:`translate(-50%,-50%) translate(${x}px,${y}px) rotate(${small?rotation*.4:rotation}deg) scale(${scale})`,zIndex:10+i,'--caption':bloom,visibility:p===0&&i>2?'hidden':'visible'};
}
onMounted(()=>{motion=matchMedia('(prefers-reduced-motion: reduce)');resize=new ResizeObserver(([e])=>width.value=e.contentRect.width);resize.observe(gallery.value);});
onUnmounted(()=>{cancelAnimationFrame(frame);resize?.disconnect();});
</script>
<template>
<div ref="gallery" class="travel-archive" :class="{'is-open':opened}" @pointerleave="leave" @focusout="blur" @keydown.esc="setOpen(false)">
 <div class="folder-back" aria-hidden="true"></div>
 <button v-for="(city,i) in destinations" :key="city.id" class="archive-photo destination-story" :style="style(i)" :data-city="city.id" :disabled="busy" :tabindex="opened?0:-1" :inert="!opened" :aria-label="chooseLabel+' · '+city[language]" @click="emit('choose',city)">
  <span class="photo-surface"><EditorialPhoto :image="photos[city.id]" :alt="city[language]"/><span class="photo-caption"><span>{{city[language]}}</span><small>{{language==='zh'?'探索城市':'Explore city'}} ↗</small></span></span>
 </button>
 <button class="folder-front" :style="{transform:`translate(-50%,-50%) perspective(1100px) rotateX(${-ease(progress*1400/300)*72}deg)`,zIndex:progress<.22?30:5}" :aria-expanded="opened" :aria-label="language==='zh'?'展开或收起精选目的地':'Open or close destinations'" @pointerenter="e=>{if(e.pointerType==='mouse')setOpen(true)}" @click="setOpen(!opened)" @keydown.arrow-down.prevent="setOpen(true)">
  <span>DESTINATIONS</span>
 </button>
</div>
</template>
<style scoped>
@font-face{font-family:'Cormorant Garamond';src:url('/fonts/cormorant-garamond-500.ttf') format('truetype');font-weight:500;font-display:swap}
.travel-archive{position:relative;height:760px;isolation:isolate;overflow:visible}
.folder-back,.folder-front{position:absolute;left:50%;top:50%;width:390px;height:260px;border:1px solid #d7ccb6;border-radius:3px 8px 5px 5px;background:#ede3cf;transform:translate(-50%,-50%)}
.folder-back{box-shadow:0 28px 45px -25px #53473355;background:linear-gradient(115deg,#f5efdf,#e8dcc5)}
.folder-back:before{content:'';position:absolute;top:-23px;left:-1px;width:116px;height:25px;background:#f3ead7;border:1px solid #d7ccb6;border-bottom:0;border-radius:7px 12px 0 0}
.folder-front{transform-origin:50% 100%;padding:0;color:#203D35;cursor:pointer;background:repeating-linear-gradient(8deg,#fff3 0px,#fff0 1px,#fff0 4px),linear-gradient(120deg,#fcf8ed,#efe5d2);box-shadow:0 4px 8px #69563815,inset 0 1px #fff,inset 0 -5px 8px #bbab8e14;border-top-color:#fff7}
.folder-front:before{content:'';position:absolute;inset:10px;border:1px solid #d3c6ae55;pointer-events:none}
.folder-front:after{content:'';position:absolute;left:0;right:0;bottom:13px;height:1px;background:#caba9f45;box-shadow:0 1px #fff8}
.folder-front span{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:32px;letter-spacing:.12em}
.folder-front:hover{background-color:#f4ecdb;color:#203D35}
.folder-front:focus-visible,.archive-photo:focus-visible{outline:3px solid #245A46;outline-offset:5px}
.archive-photo{position:absolute;left:50%;top:50%;width:21%;max-width:250px;aspect-ratio:3/4;border:0;padding:6px;background:#fffaf0;border-radius:1px;box-shadow:0 8px 22px #203d3520;cursor:pointer;will-change:transform}
.photo-surface{display:block;position:relative;width:100%;height:100%;overflow:hidden;transition:transform .35s ease,box-shadow .35s ease}
.photo-surface :deep(img){width:100%;height:100%;object-fit:cover}
.photo-caption{position:absolute;bottom:0;left:0;right:0;padding:35px 8px 14px;background:linear-gradient(transparent,#102a24b3);color:white;display:flex;flex-direction:column;align-items:center;gap:6px;opacity:var(--caption);transition:background .3s}
.photo-caption span{font-family:'Songti SC',serif;font-size:25px;font-weight:400}.photo-caption small{font-size:11px}
.archive-photo:hover,.archive-photo:focus-visible{z-index:40!important;background:#fffaf0}
.archive-photo:hover .photo-surface,.archive-photo:focus-visible .photo-surface{transform:translateY(-7px);box-shadow:0 12px 20px #203d3525}
@media(max-width:650px){.travel-archive{height:1060px}.folder-back,.folder-front{width:270px;height:190px}.folder-front span{font-size:23px}.archive-photo{width:43%;max-width:190px}.photo-caption span{font-size:21px}.photo-caption{padding-bottom:10px}}
@media(prefers-reduced-motion:reduce){.photo-surface{transition:none!important}.archive-photo{will-change:auto}}
</style>
