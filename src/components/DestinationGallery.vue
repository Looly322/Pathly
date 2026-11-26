<script setup>
import {ref,onMounted,onUnmounted} from 'vue';
import EditorialPhoto from './EditorialPhoto.vue';
import photography from '../data/destinationPhotography.json';
import {language} from '../i18n';
defineProps({destinations:Array,busy:Boolean,chooseLabel:String});
const emit=defineEmits(['choose']);
const gallery=ref(null),width=ref(1200),height=ref(640),progress=ref(0),opened=ref(false);
// Independent image fields prevent background/postcard asset reuse.

let frame=0,last=0,resize,motion;
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n)};
function tick(now){const dt=last?Math.min(now-last,40):16;last=now;progress.value=clamp(progress.value+(opened.value?1:-1)*dt/1400);if(progress.value!==(opened.value?1:0))frame=requestAnimationFrame(tick);else{frame=0;last=0;}}
function setOpen(value){opened.value=value;if(motion?.matches){progress.value=value?1:0;cancelAnimationFrame(frame);frame=0;return;}if(!frame)frame=requestAnimationFrame(tick);}
function leave(e){if(e.pointerType==='mouse'&&!gallery.value.querySelector(':focus-visible'))setOpen(false);}
function blur(e){if(!gallery.value.contains(e.relatedTarget))setOpen(false);}
// A fixed canvas and normalized perimeter slots keep the center reserved.
function slot(i){
 const mobile=width.value<650;
 return mobile?{x:[.23,.77][i%2],y:[.11,.31,.69,.89][Math.floor(i/2)]}
 :{x:[.115,.32,.61,.875,.12,.335,.67,.89][i],y:[.26,.17,.18,.30,.73,.82,.81,.74][i]};
}
function style(i){
 const p=progress.value,w=width.value,h=height.value,mobile=w<650;
 const fan=ease((p*1400-300-i*25)/325),bloom=ease((p*1400-800-i*20)/460);
 const target=slot(i);
 const finalX=(target.x-.5)*w,finalY=(target.y-.5)*h;
 const fx=(i-3.5)*w*.035,fy=-h*(.08+Math.sin(i/7*Math.PI)*.08);
 const x=fx*fan+(finalX-fx)*bloom,y=fy*fan+(finalY-fy)*bloom;
 const fanAngle=(i-3.5)*6;
 const rotation=fanAngle*fan+([ -4,3,-2,4,3,-4,4,-3 ][i]-fanAngle)*bloom;
 const scale=.55+.25*fan+(.2+(mobile?0:[.02,-.08,.04,-.03,-.04,.06,-.06,.02][i]))*bloom;
 return {transform:`translate(-50%,-50%) translate(${x}px,${y}px) rotate(${mobile?rotation*.5:rotation}deg) scale(${scale})`,zIndex:10+i,'--caption':bloom,opacity:ease((p*1400-300-i*25)/180)};
}
onMounted(()=>{motion=matchMedia('(prefers-reduced-motion: reduce)');resize=new ResizeObserver(([e])=>{width.value=e.contentRect.width;height.value=e.contentRect.height});resize.observe(gallery.value);});
onUnmounted(()=>{cancelAnimationFrame(frame);resize?.disconnect();});
</script>
<template>
<div ref="gallery" class="travel-archive" :class="{'is-open':opened}" @pointerleave="leave" @focusout="blur" @keydown.esc="setOpen(false)">
 <div class="background-layer" aria-hidden="true"></div>
 <div class="folder-layer">
 <div class="folder-back" aria-hidden="true"></div>
 <button class="folder-front" :style="{transform:`translate(-50%,-50%) rotateX(${-ease(progress*1400/300)*28}deg)`}" :aria-expanded="opened" :aria-label="language==='zh'?'展开或收起精选目的地':'Open or close destinations'" @pointerenter="e=>{if(e.pointerType==='mouse')setOpen(true)}" @click="setOpen(!opened)" @keydown.arrow-down.prevent="setOpen(true)">
  <span>DESTINATIONS</span>
  <img class="botanical-collage" src="/images/home/folder-botanical.png" alt="" aria-hidden="true"/>
 </button>
 </div>
 <div class="postcard-layer">
 <button v-for="(city,i) in destinations" :key="city.id" class="photo-shell archive-photo destination-story" :style="style(i)" :data-city="city.id" :disabled="busy" :tabindex="opened?0:-1" :inert="!opened" :aria-label="chooseLabel+' · '+city[language]" @click="emit('choose',city)">
  <span class="photo-surface"><EditorialPhoto :image="photography[city.id].postcardImage" :alt="city[language]"/><span class="photo-caption"><span>{{city[language]}}</span><small>{{language==='zh'?'探索城市':'Explore city'}} ↗</small></span></span>
 </button>
 </div>
 <span class="archive-hint" :style="{opacity:1-ease(progress*4)}">{{language==='zh'?(width<650?'轻触，打开世界 ↗':'悬停，打开世界 ↗'):(width<650?'Tap to open the world ↗':'Hover to open the world ↗')}}</span>
 <button v-if="opened" class="archive-close" @click="setOpen(false)">{{language==='zh'?'收起照片':'Close photos'}} ↑</button>
</div>
</template>
<style scoped>
@font-face{font-family:'Cormorant Garamond';src:url('/fonts/cormorant-garamond-500.ttf') format('truetype');font-weight:500;font-display:swap}
.travel-archive{position:relative;height:clamp(580px,52vw,720px);width:calc(100% + 12vw);margin-left:-6vw;isolation:isolate;overflow:visible;background:radial-gradient(ellipse at 50% 55%,#e9d6b51c,transparent 62%)}
.background-layer,.folder-layer,.postcard-layer{position:absolute;inset:0;pointer-events:none}.background-layer{z-index:0;overflow:hidden;background:url("/images/home/destination-snow-lake.jpg") center / cover no-repeat}.postcard-layer{z-index:20}.folder-layer{z-index:30}.folder-front,.archive-photo{pointer-events:auto}
.folder-back,.folder-front{position:absolute;left:50%;top:50%;width:clamp(220px,26vw,310px);height:180px;border:1px solid #d7ccb6;border-radius:3px 8px 5px 5px;background:#ede3cf;transform:translate(-50%,-50%)}
.folder-back{box-shadow:0 28px 45px -25px #53473355;background:linear-gradient(115deg,#f5efdf,#e8dcc5)}
.folder-back:before{content:'';position:absolute;top:-23px;left:-1px;width:116px;height:25px;background:#f3ead7;border:1px solid #d7ccb6;border-bottom:0;border-radius:7px 12px 0 0}
.folder-front{transform-origin:50% 100%;padding:0;color:#203D35;cursor:pointer;-webkit-tap-highlight-color:transparent;background:repeating-linear-gradient(8deg,#fff3 0px,#fff0 1px,#fff0 4px),linear-gradient(120deg,#fcf8ed,#efe5d2);box-shadow:0 4px 8px #69563815,inset 0 1px #fff,inset 0 -5px 8px #bbab8e14;border-top-color:#fff7}
.folder-front:before{content:'';position:absolute;inset:10px;border:1px solid #d3c6ae55;pointer-events:none}
.folder-front:after{content:'';position:absolute;left:0;right:0;bottom:13px;height:1px;background:#caba9f45;box-shadow:0 1px #fff8}
.folder-front span{position:absolute;top:24px;left:0;right:0;z-index:2;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:clamp(21px,2.2vw,25px);letter-spacing:.12em}
.botanical-collage{position:absolute;right:8px;bottom:5px;width:125px;height:125px;object-fit:contain;pointer-events:none;z-index:1}
.folder-front:hover{background-color:#f4ecdb;color:#203D35}
.folder-front:focus-visible,.archive-photo:focus-visible{outline:3px solid #245A46;outline-offset:5px}
.photo-shell{position:absolute;left:50%;top:50%;width:17%;max-width:180px;aspect-ratio:3/4;border:0;padding:6px;background:#fffaf0;border-radius:1px;box-shadow:0 8px 22px #203d3520;cursor:pointer;will-change:transform}
.background-photo{pointer-events:none;cursor:default;will-change:auto;max-width:none!important;aspect-ratio:auto;padding:0;border:0;border-radius:0;box-shadow:0 8px 24px #203d3518;background:transparent}.archive-photo{padding:7px;width:16%;max-width:170px}.postcard-layer:not(:has(.archive-photo:not([inert]))){pointer-events:none}
.photo-surface{display:block;position:relative;width:100%;height:100%;overflow:hidden;transition:transform .35s ease,box-shadow .35s ease}
.photo-surface :deep(img){width:100%;height:100%;object-fit:cover}
.photo-caption{position:absolute;bottom:0;left:0;right:0;padding:35px 8px 14px;background:linear-gradient(transparent,#102a24b3);color:white;display:flex;flex-direction:column;align-items:center;gap:6px;opacity:var(--caption);transition:background .3s}
.photo-caption span{font-family:'Songti SC',serif;font-size:25px;font-weight:400}.photo-caption small{font-size:11px;color:#fff}
.archive-photo:hover,.archive-photo:focus-visible{z-index:40!important;background:#fffaf0}
.archive-photo:hover .photo-surface,.archive-photo:focus-visible .photo-surface{transform:translateY(-7px);box-shadow:0 12px 20px #203d3525}
.archive-hint{position:absolute;z-index:31;width:max-content;max-width:90%;margin:auto;padding:7px 13px;background:#faf9f6ed;top:calc(50% + 111px);left:0;right:0;text-align:center;color:#68786d;font-size:12px;letter-spacing:.12em;pointer-events:none}.archive-close{display:none}
@media(max-width:650px){.archive-close{display:block;position:absolute;bottom:0;left:50%;transform:translateX(-50%);z-index:50;background:#f5efdf;color:#203D35;border:1px solid #d7ccb6;padding:8px 16px;font-size:12px}.travel-archive{height:640px;width:calc(100% + 8vw);margin-left:-4vw}.archive-hint{top:calc(50% + 73px);font-size:10px}.folder-back,.folder-front{width:180px;height:120px}.folder-front span{font-size:16px;top:12px}.botanical-collage{width:78px;height:78px;right:4px;bottom:3px}.photo-shell{width:28%;max-width:125px}.archive-photo{width:25%;max-width:125px;padding:4px}.photo-caption span{font-size:17px}.photo-caption small{font-size:9px}.photo-caption{padding:22px 3px 6px;gap:2px}}
@media(prefers-reduced-motion:reduce){.photo-surface{transition:none!important}.archive-photo{will-change:auto}}
</style>
