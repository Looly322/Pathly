import {localDate} from '../services/weatherService.js';
const hourTables=new WeakMap();
const finite=v=>typeof v==='number'&&Number.isFinite(v);
// 不从名称猜室内外。只使用明确标签或足够具体的来源分类，文化/艺术大类保持未知。
export function exposure(place){
 if(['indoor','outdoor','mixed'].includes(place.environment))return place.environment;
 if(place.indoor===true)return 'indoor';if(place.outdoor===true)return 'outdoor';
 if(place.poiCategory==='MUSEUM')return 'indoor';
 if(['NATURE','CITY_WALK'].includes(place.category))return 'outdoor';
 const categories=(place.categories||[]).map(c=>c.name||'');
 if(categories.some(c=>/^(Museum|Art Museum|History Museum|博物馆|美术馆)$/.test(c)))return 'indoor';
 if(categories.some(c=>/^(Park|Garden|Beach|公园|广场|海滩)$/.test(c)))return 'outdoor';
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
