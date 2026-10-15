import {scheduleDay} from './planner.js';
import {localDate} from '../services/weatherService.js';
const hourTables=new WeakMap();
const finite=v=>typeof v==='number'&&Number.isFinite(v);
// 不从名称猜室内外。只使用明确标签或足够具体的来源分类，文化/艺术大类保持未知。
export function exposure(place){
 if(['indoor','outdoor','mixed'].includes(place.environment))return place.environment;
 if(place.indoor===true)return 'indoor';if(place.outdoor===true)return 'outdoor';
 if(place.poiCategory==='MUSEUM')return 'indoor';
 if(['NATURE','CITY_WALK'].includes(place.category))return 'outdoor';
 const categories=(place.categories||[]).map(c=>c.name||'').join('|');
 if(/^(Museum|Art Museum|History Museum|博物馆|美术馆)$/.test(categories))return 'indoor';
 if(/^(Park|Garden|Beach|公园|广场|海滩)$/.test(categories))return 'outdoor';
 return 'unknown';
}
function table(data){
 if(hourTables.has(data))return hourTables.get(data);
 const result=new Map(),hourly=data?.hourly;
 if(!hourly?.time||!finite(data.utc_offset_seconds)||!data.timezone)return result;
 const format=new Intl.DateTimeFormat('en-CA',{timeZone:data.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
 hourly.time.forEach((time,i)=>{
  // API ISO 小时使用响应的固定偏移；转换为瞬时点后，按 IANA 时区处理夏令时。
  const epoch=Date.parse(time+'Z')-data.utc_offset_seconds*1000;if(!finite(epoch))return;
  const parts=format.formatToParts(new Date(epoch)),get=k=>parts.find(p=>p.type===k)?.value;
  const key=`${get('year')}-${get('month')}-${get('day')}T${get('hour')}`;
  // 降水概率表示此前一小时，因此 [09:00,10:00) 使用 10:00 的概率。
  const row={temperature:hourly.temperature_2m?.[i],wind:hourly.wind_speed_10m?.[i],rain:hourly.precipitation_probability?.[i+1]};
  const rows=result.get(key)||[];rows.push(row);result.set(key,rows);
 });hourTables.set(data,result);return result;
}
export function eventWeather(event,date,data,now=new Date()){
 const env=exposure(event.place),missing={complete:false,score:0,reasons:[],environment:env};
 if(!data?.hourly||!finite(data.fetchedAt)||now.getTime()/1000-data.fetchedAt>1800||date<localDate(data.timezone,now))return missing;
 let score=0;const reasons=new Set();const hours=table(data);
 for(let hour=Math.floor(event.start/60);hour<Math.ceil(event.end/60);hour++){
  const rows=hours.get(`${date}T${String(hour).padStart(2,'0')}`);
  if(!rows?.length||rows.some(r=>![r.temperature,r.wind,r.rain].every(finite)))return missing;
  // 重复的夏令时小时采取较保守值，不忽略其中一次。
  const rain=Math.max(...rows.map(r=>r.rain)),temperature=Math.max(...rows.map(r=>r.temperature)),wind=Math.max(...rows.map(r=>r.wind));
  const duration=Math.max(0,Math.min(event.end,(hour+1)*60)-Math.max(event.start,hour*60))/60;
  let risk=0;
  if(rain>=60){risk+=30*rain/100;reasons.add('rain');}
  if(temperature>=35){risk+=20+(temperature-35)*3;reasons.add('heat');}
  if(wind>=40){risk+=25+(wind-40)*.5;reasons.add('wind');}
  score+=risk*duration*({indoor:.15,outdoor:1,mixed:.6,unknown:1}[env]);
 }
 return {complete:true,score,reasons:[...reasons],environment:env,affected:env!=='indoor'&&reasons.size>0};
}
export function assessWeather(plan,data,now=new Date()){
 let score=0,complete=true;const risks={},affected=[];
 for(const day of plan.days)for(const event of day.events.filter(e=>e.kind==='ACTIVITY')){
  const risk=eventWeather(event,day.date,data,now);risks[day.date+'|'+event.id]=risk;score+=risk.score;complete&&=risk.complete;
  if(risk.affected)affected.push({date:day.date,event,risk});
 }
 return {score,complete,risks,affected};
}
function openings(place,date){
 const dated=place.openingHoursByDate;
 if(dated&&Object.hasOwn(dated,date))return dated[date];
 const weekly=place.openingHours?.weekly,key=new Date(date+'T12:00:00Z').getUTCDay();
 if(weekly&&Object.hasOwn(weekly,key))return weekly[key];
 return null;
}
function openAt(place,date,start,end){
 const ranges=openings(place,date);if(!Array.isArray(ranges))return null;
 if(!ranges.length)return false;
 const minute=value=>typeof value==='string'&&/^\d{2}:\d{2}$/.test(value)?Number(value.slice(0,2))*60+Number(value.slice(3)):NaN;
 if(ranges.some(r=>!finite(minute(r.start))||!finite(minute(r.end))))return null;
 return ranges.some(r=>start>=minute(r.start)&&end<=minute(r.end));
}
const activities=day=>day.events.filter(e=>e.kind==='ACTIVITY');
const km=day=>day.events.reduce((sum,e)=>sum+(e.travel?.km||0),0);
const ids=values=>values.map(v=>v.place?.id||v.id).sort().join('|');
function positions(plan){return new Map(plan.days.flatMap((day,d)=>activities(day).map((event,index)=>[event.id,{day:d,date:day.date,index,event}])));}
function pinned(event,settings,day,now,data){
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:data.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 const elapsed=day.date===localDate(data.timezone,now)&&event.start<Number(time.slice(0,2))*60+Number(time.slice(3));
 return elapsed||settings.mustIds?.includes(event.id)||event.locked||event.place.locked||event.place.timeLocked||event.place.fixedTime!=null||event.fixedStart!=null;
}
function validTrial(original,trial,settings,data,now){
 const before=positions(original),after=positions(trial),unknown=[];
 if(before.size!==after.size||[...before.keys()].some(id=>!after.has(id)))return null;
 for(const [id,a] of before){
  const b=after.get(id),moved=a.day!==b.day||a.index!==b.index||a.event.start!==b.event.start||a.event.end!==b.event.end;
  if(a.event.duration!==b.event.duration)return null;
  if(!moved)continue;
  if(pinned(a.event,settings,original.days[a.day],now,data)||exposure(a.event.place)==='unknown')return null;
  const open=openAt(b.event.place,b.date,b.event.start,b.event.end);
  if(open===false)return null;
  if(open===null){if(a.day!==b.day)return null;unknown.push(id);}
 }
 // 锁定不仅固定编号：其他地点也不能越过锁定地点的前后边界。
 for(const [id,a] of before)if(pinned(a.event,settings,original.days[a.day],now,data)){
  const b=after.get(id);if(ids(activities(original.days[a.day]).slice(0,a.index))!==ids(activities(trial.days[b.day]).slice(0,b.index)))return null;
 }
 for(let d=0;d<trial.days.length;d++){
  const a=original.days[d],b=trial.days[d];if(a===b)continue;
  if(b.conflicts.length||b.fatigue.travel>a.fatigue.travel+20||km(b)>km(a)+Math.max(1,km(a)*.2)||b.fatigue.score>a.fatigue.score+5)return null;
  for(const event of a.events.filter(e=>e.place)){
   const next=b.events.find(e=>e.id===event.id);
   if(pinned(event,settings,a,now,data)&&(!next||event.start!==next.start||event.end!==next.end||a.events.indexOf(event)!==b.events.indexOf(next)))return null;
   if(event.kind==='MEAL'&&next&&(event.start!==next.start||event.end!==next.end)){
    const open=openAt(event.place,b.date,next.start,next.end);if(open===false)return null;if(open===null)unknown.push(event.place.id);
   }
  }
  const oldMeals=a.events.filter(e=>e.kind==='MEAL'),newMeals=b.events.filter(e=>e.kind==='MEAL');
  if(oldMeals.length!==newMeals.length||oldMeals.some((e,i)=>e.slot!==newMeals[i].slot||e.place?.id!==newMeals[i].place?.id))return null;
 }
 return unknown;
}
function reschedule(day,items,settings,pace){
 const food=day.events.filter(e=>e.kind==='MEAL'&&e.place).map(e=>e.place);
 return {...day,...scheduleDay(items,settings,pace,food)};
}
function itemList(day){return activities(day).map(e=>({place:e.place,duration:e.duration}));}
function* permutations(items){if(items.length<2){yield items;return;}for(let i=0;i<items.length;i++)for(const tail of permutations(items.filter((_,j)=>j!==i)))yield [items[i],...tail];}
export function weatherChanges(original,trial){
 const a=positions(original),b=positions(trial),changes=[];
 for(const [id,before] of a){const after=b.get(id);if(before.date!==after.date||before.index!==after.index||before.event.start!==after.event.start||before.event.end!==after.event.end)changes.push({id,name:before.event.place.name,place:before.event.place,before,after});}
 return changes;
}
export function optimizeWeather(plan,settings,data,now=new Date()){
 const initial=assessWeather(plan,data,now);
 if(!initial.complete)return {reason:'missing'};
 if(!initial.affected.length)return {reason:'calm'};
 let best=plan,bestScore=initial.score,bestUnknown=[];
 function consider(candidate){
  const unknown=validTrial(plan,candidate,settings,data,now);if(!unknown)return;
  const assessment=assessWeather(candidate,data,now);if(!assessment.complete)return;
  const extraTravel=candidate.days.reduce((sum,d,i)=>sum+Math.max(0,d.fatigue.travel-plan.days[i].fatigue.travel),0);
  const objective=assessment.score+extraTravel*.3;
  if(objective<bestScore-0.01){best=candidate;bestScore=objective;bestUnknown=unknown;}
 }
 // 优先同日顺序；保持游览时长，继续使用已有餐休/交通/疲劳排程器。
 for(let d=0;d<plan.days.length;d++){
  const base=best,items=itemList(base.days[d]);if(items.length>5)continue;
  for(const order of permutations(items)){
   if(ids(order)!==ids(items))continue;
   const days=[...base.days];days[d]=reschedule(base.days[d],order,settings,plan.id);consider({...base,days});
  }
 }
 const worthwhile=()=>initial.score-bestScore>=Math.max(5,initial.score*.1);
 // 同日无明显收益才试一次跨天两点交换；未知营业时间禁止跨天移动。
 if(!worthwhile()){
  best=plan;bestScore=initial.score;bestUnknown=[];
  for(let a=0;a<plan.days.length;a++)for(let b=a+1;b<plan.days.length;b++){
   const left=itemList(plan.days[a]),right=itemList(plan.days[b]);
   for(let i=0;i<left.length;i++)for(let j=0;j<right.length;j++){
    if(!openings(left[i].place,plan.days[b].date)||!openings(right[j].place,plan.days[a].date))continue;
    const l=[...left],r=[...right];[l[i],r[j]]=[r[j],l[i]];
    const days=[...plan.days];days[a]=reschedule(days[a],l,settings,plan.id);days[b]=reschedule(days[b],r,settings,plan.id);consider({...plan,days});
   }
  }
 }
 if(!worthwhile())return {reason:'noBetter'};
 return {plan:best,changes:weatherChanges(plan,best),unknownHours:bestUnknown,before:initial.score,after:assessWeather(best,data,now).score};
}
