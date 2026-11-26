import {reactive,ref,watch} from 'vue';
export const DRAFT_KEY='pathly.draft.v1';
export function defaults(){const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());return {selectedCity:'',date:now.toISOString().slice(0,10),days:3,party:'solo',people:1,transport:'transit',start:'09:00',end:'20:00',budget:500,interests:['CULTURE','FOOD'],pace:'balanced',walking:'medium',wishlist:[],mustPlaces:[],hotel:null,restaurants:[],visitPreferences:{},mealWindows:{LUNCH:{start:'11:30',end:'13:30'},DINNER:{start:'17:30',end:'20:00'}}};}
export function endDate(form){const d=new Date(form.date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+Math.max(1,Number(form.days)||1)-1);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';}
export function readDraft(storage){const raw=storage.getItem(DRAFT_KEY);if(!raw)return defaults();const data=JSON.parse(raw);if(data.version!==1||!data.form||typeof data.form!=='object')throw Error('Invalid draft');return {...defaults(),...data.form};}
export function writeDraft(form,storage){const data=JSON.stringify({version:1,updatedAt:new Date().toISOString(),form:{...form,endDate:endDate(form)}},(key,value)=>['weather','routes','presentation'].includes(key)?undefined:value);if(new Blob([data]).size>1024*1024)throw Error('Draft exceeds 1MB');storage.setItem(DRAFT_KEY,data);}
export const draftError=ref('');let initial=defaults();
try{if(typeof localStorage!=='undefined')initial=readDraft(localStorage);}catch{draftError.value='草稿无法读取，原记录未删除。 / Draft could not be read; original data retained.';}
export const tripDraft=reactive(initial);
export function saveDraft(){try{writeDraft(tripDraft,localStorage);draftError.value='';}catch{draftError.value='草稿未保存：本地存储不可用或空间不足。 / Draft not saved: storage unavailable or full.';}}
export function updateDraft(form){Object.assign(tripDraft,JSON.parse(JSON.stringify(form)));saveDraft();}
export function newDraft(){for(const k of Object.keys(tripDraft))delete tripDraft[k];Object.assign(tripDraft,defaults());saveDraft();}
let resetting=false;
watch(tripDraft,()=>{if(!resetting&&typeof localStorage!=='undefined')saveDraft();},{deep:true,flush:'sync'});
