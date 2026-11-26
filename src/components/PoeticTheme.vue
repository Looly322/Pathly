<script setup>
import {ref,onMounted,onUnmounted,computed} from 'vue';
import {language} from '../i18n';
import EditorialPhoto from './EditorialPhoto.vue';
const props=defineProps({item:Object,index:Number,selected:Boolean,busy:Boolean,selectedText:String});
const emit=defineEmits(['choose']);
const root=ref(null),wall=ref(null),entered=ref(false),exploring=ref(false),near=ref(false),reduced=ref(false),mobile=ref(false);
const idx=computed(()=>language.value==='zh'?0:1);
const characters=computed(()=>{let offset=0;return props.item.poem.lines.map(line=>Array.from(line).map(char=>({char,order:offset++})));});
const count=computed(()=>characters.value.flat().length);
const step=computed(()=>mobile.value?20:60),intro=computed(()=>mobile.value?850:1250);
const authorDelay=computed(()=>intro.value+(count.value-1)*step.value+(mobile.value?400:750));
const positions=[[-3,-6,32,48,.7],[35,-9,29,48,1.1],[77,7,30,51,.85],[3,62,30,47,1.15],[36,49,32,55,.55],[77,68,31,42,1.35]];
let motion,pointer,small,observer,loader,frame=0,timer=0,active=false,x=0,y=0,tx=0,ty=0;
function finish(){clearTimeout(timer);exploring.value=true;}
function enter(){if(entered.value)return;entered.value=true;near.value=true;if(reduced.value)finish();else timer=setTimeout(finish,authorDelay.value+650);}
function animate(){frame=0;x+=(tx-x)*.085;y+=(ty-y)*.085;wall.value?.style.setProperty('--pan-x',x+'px');wall.value?.style.setProperty('--pan-y',y+'px');if(Math.abs(tx-x)+Math.abs(ty-y)>.08)frame=requestAnimationFrame(animate);}
function move(event){if(!exploring.value||!active||reduced.value||mobile.value||!pointer.matches)return;const r=root.value.getBoundingClientRect();tx=(event.clientX-r.left-r.width/2)/r.width*125;ty=(event.clientY-r.top-r.height/2)/r.height*90;if(!frame)frame=requestAnimationFrame(animate);}
function reset(){tx=ty=0;if(!frame&&!reduced.value)frame=requestAnimationFrame(animate);}
function preference(){reduced.value=motion.matches;mobile.value=small.matches;if(reduced.value||mobile.value){cancelAnimationFrame(frame);frame=0;x=y=tx=ty=0;wall.value?.style.setProperty('--pan-x','0px');wall.value?.style.setProperty('--pan-y','0px');}if(reduced.value&&entered.value)finish();}
function photoStyle(i){const [left,top,width,height,depth]=positions[i];return {'--left':left+'%','--top':top+'%','--width':width+'%','--height':height+'%','--depth':depth,'--photo-delay':i*(mobile.value?50:90)+'ms'};}
onMounted(()=>{
 motion=matchMedia('(prefers-reduced-motion: reduce)');pointer=matchMedia('(hover: hover) and (pointer: fine)');small=matchMedia('(max-width: 700px)');preference();motion.addEventListener('change',preference);small.addEventListener('change',preference);
 loader=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){near.value=true;loader.disconnect();}},{rootMargin:'450px'});loader.observe(root.value);
 observer=new IntersectionObserver(entries=>{const e=entries[0];active=e.isIntersecting;if(e.intersectionRatio>=.4)enter();if(!active)reset();},{threshold:[0,.4]});observer.observe(root.value);
});
onUnmounted(()=>{observer?.disconnect();loader?.disconnect();motion?.removeEventListener('change',preference);small?.removeEventListener('change',preference);cancelAnimationFrame(frame);clearTimeout(timer);});
</script>
<template>
<article ref="root" class="poetic-theme" :class="['theme-'+index,{entered,exploring,'reduced-motion':reduced}]" :style="{'--author-delay':authorDelay+'ms'}" @pointermove="move" @pointerleave="reset">
 <div ref="wall" class="photo-wall" aria-hidden="true"><div v-for="(photo,i) in item.wall" :key="photo.image" class="wall-position" :style="photoStyle(i)"><div class="wall-photo"><EditorialPhoto v-if="near" :image="photo.image" :alt="photo.alt[idx]"/></div></div></div>
 <div class="wall-shade" aria-hidden="true"></div>
 <div class="poem-overlay">
  <p class="poem-chapter"><span class="chapter-number">0{{index+1}}</span><span>{{item.title[idx]}}</span></p>
  <blockquote :aria-label="item.poem.lines.join('')"><span v-for="(line,i) in characters" :key="i" class="poem-line" aria-hidden="true"><span v-for="c in line" :key="c.order" class="poem-character" :style="{'--char-delay':intro+c.order*step+'ms'}">{{c.char}}</span></span></blockquote>
  <p class="poem-author" @animationend.self="finish">——{{item.poem.credit[idx]}}</p>
  <p v-if="language==='en'" class="poem-translation">{{item.poem.english}}</p>
  <button class="interest-story" :disabled="busy" :aria-pressed="selected" @click="emit('choose',item.id)">{{selected?'✓ '+selectedText:(language==='zh'?'选择'+item.title[0]:'Choose '+item.title[1])}} <span aria-hidden="true">↗</span></button>
 </div>
 <div class="wall-footer"><span>{{language==='zh'?'移动光标，漫游影像':'MOVE TO WANDER'}}</span><small>{{item.poem.context[idx]}}</small><span class="wall-count">06 / {{language==='zh'?'旅行瞬间':'FRAMES'}}</span></div>
</article>
</template>
<style scoped>
@font-face{font-family:PathlyPoetry;src:url('/fonts/pathly-poems.woff2') format('woff2');font-style:normal;font-weight:400;font-display:swap}
.poetic-theme{position:relative;isolation:isolate;overflow:hidden;width:calc(100% + 14vw);margin:0 -7vw 48px;height:90svh;min-height:780px;max-height:1100px;background:#172922;color:#fffdf5;touch-action:pan-y}
.theme-1{background:#302921}.theme-2{background:#17232a}.theme-3{background:#30241e}
.photo-wall{position:absolute;inset:-9%;z-index:-3;pointer-events:none;transform:translate(calc(var(--pan-x,0px)*.25),calc(var(--pan-y,0px)*.25))}
.wall-position{position:absolute;left:var(--left);top:var(--top);width:var(--width);height:var(--height);transform:translate(calc(var(--pan-x,0px)*var(--depth)),calc(var(--pan-y,0px)*var(--depth))}
.wall-photo{width:100%;height:100%;opacity:0;transform:translateY(38px) scale(.97);box-shadow:0 18px 60px #0004}
.entered .wall-photo{animation:wall-arrive .75s cubic-bezier(.16,1,.3,1) var(--photo-delay) both}
.wall-shade{position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse at center,rgba(9,19,16,.84) 0%,rgba(9,19,16,.65) 35%,rgba(9,19,16,.12) 76%),linear-gradient(0deg,#07110ec4,transparent 20%,transparent 83%,#07110e40)}
.poem-overlay{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;width:100%;height:100%;padding:75px 24px 100px;pointer-events:none}
.poem-chapter{display:flex;align-items:center;gap:22px;font-size:12px;letter-spacing:.22em;margin:0 0 28px}.chapter-number{font-family:Baskerville,'Times New Roman',serif;font-size:28px;font-style:italic;letter-spacing:.01em;font-weight:400}
.poem-overlay blockquote{margin:0;font-family:PathlyPoetry,'Noto Serif SC','Source Han Serif SC','Songti SC',STSong,serif;font-weight:400;font-size:clamp(56px,5.2vw,80px);line-height:1.65;letter-spacing:.035em;text-shadow:0 2px 22px #0004}
.poem-line{display:block;white-space:nowrap}.poem-character{display:inline-block;opacity:0;transform:translateY(25px);filter:blur(6px)}
.entered .poem-character{animation:character-arrive .75s cubic-bezier(.16,1,.3,1) var(--char-delay) both}
.poem-author{font-family:inherit;font-size:14px;letter-spacing:.16em;font-weight:400;margin:24px 0 0;opacity:0}
.entered .poem-author{animation:meta-arrive .6s ease var(--author-delay) both}
.poem-translation{max-width:650px;font-size:15px;line-height:1.8;margin:15px 0 0;opacity:0}.entered .poem-translation{animation:meta-arrive .6s ease var(--author-delay) both}
.interest-story{pointer-events:auto;border:1px solid #fff8;border-radius:2px;padding:12px 24px;margin-top:30px;color:#fffdf5;background:#0e201dc9;font-size:12px;letter-spacing:.08em;display:flex;align-items:center;gap:22px;transition:background .2s,border-color .2s}
.interest-story:hover:not(:disabled){background:#244a3e;color:white;border-color:white}.interest-story:focus-visible{outline:2px solid white;outline-offset:5px}
.wall-footer{position:absolute;bottom:28px;left:5%;right:5%;display:flex;align-items:end;justify-content:space-between;gap:24px;pointer-events:none;color:#fff9;font-size:10px;letter-spacing:.12em}.wall-footer small{max-width:530px;text-align:center;line-height:1.8;font-size:10px;letter-spacing:0}.wall-count{white-space:nowrap}
@keyframes wall-arrive{to{opacity:1;transform:translateY(0) scale(1)}}@keyframes character-arrive{to{opacity:1;transform:translateY(0);filter:blur(0)}}@keyframes meta-arrive{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:700px){.poetic-theme{width:calc(100% + 12vw);margin-left:-6vw;margin-right:-6vw;min-height:700px;height:90svh;margin-bottom:24px}.poem-overlay{padding:60px 10px 100px}.poem-overlay blockquote{font-size:clamp(26px,6.4vw,44px);line-height:1.9;letter-spacing:.01em}.poem-chapter{font-size:11px;margin-bottom:24px}.poem-author{font-size:12px;margin-top:20px}.photo-wall{inset:-6% -36%}.entered .wall-photo{animation-duration:.5s}.entered .poem-character{animation-duration:.4s;filter:none;transform:translateY(12px)}.wall-footer{bottom:20px;display:block;text-align:center}.wall-footer>span:first-child{display:none}.wall-count{display:block;margin-top:8px}.wall-footer small{display:block}.poem-translation{font-size:12px;max-width:310px}.interest-story{font-size:11px;margin-top:24px}.wall-shade{background:radial-gradient(ellipse at center,#091310df,#09131099 50%,#09131022),linear-gradient(0deg,#07110ec4,transparent 30%)}}
@media(prefers-reduced-motion:reduce){.photo-wall,.wall-position{transform:none!important}.wall-photo,.poem-character,.poem-author,.poem-translation{animation:none!important;opacity:1!important;filter:none!important;transform:none!important}.interest-story{transition:none}}
</style>
