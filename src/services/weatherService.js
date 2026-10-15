// 天气与地点/规划完全独立；同一目的地的不同旅行日期复用预报窗口。
const cache=new Map(),pending=new Map();
export function weatherCoordinates(destination){
 let latitude=Number(destination.latitude),longitude=Number(destination.longitude);
 if(!Number.isFinite(latitude+longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('INVALID_COORDINATES');
 // 高德目的地为 GCJ-02，仅在天气请求中近似转换为 WGS84，不改变地图数据。
 if(destination.coordinateSystem==='GCJ02'&&longitude>=72.004&&longitude<=137.8347&&latitude>=.8293&&latitude<=55.8271){
  const x=longitude-105,y=latitude-35,pi=Math.PI;
  let a=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x));
  a+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3+(20*Math.sin(y*pi)+40*Math.sin(y*pi/3))*2/3+(160*Math.sin(y*pi/12)+320*Math.sin(y*pi/30))*2/3;
  let b=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x));
  b+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3+(20*Math.sin(x*pi)+40*Math.sin(x*pi/3))*2/3+(150*Math.sin(x*pi/12)+300*Math.sin(x*pi/30))*2/3;
  const rad=latitude*pi/180,m=1-.006693421622965943*Math.sin(rad)**2;
  latitude-=a*180/((6378245*(1-.006693421622965943)/(m*Math.sqrt(m)))*pi);
  longitude-=b*180/(6378245/Math.sqrt(m)*Math.cos(rad)*pi);
 }
 return {latitude:+latitude.toFixed(4),longitude:+longitude.toFixed(4)};
}
export async function getWeather(destination){
 const point=weatherCoordinates(destination),key='hourly-v1:'+JSON.stringify(point),saved=cache.get(key);
 if(saved&&Date.now()-saved.fetchedAt*1000<600000)return saved;
 if(!pending.has(key)){
  const task=fetch('/api/weather?'+new URLSearchParams(point),{signal:AbortSignal.timeout(11000)}).then(async r=>{
   if(!r.ok)throw Error('WEATHER_UNAVAILABLE');const data=await r.json();
   if(!data.timezone||!Array.isArray(data.daily?.time))throw Error('WEATHER_INVALID_RESPONSE');
   cache.set(key,data);return data;
  });pending.set(key,task);task.finally(()=>pending.delete(key)).catch(()=>{});
 }
 return pending.get(key);
}
export function localDate(timezone,now=new Date()){
 const p=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=k=>p.find(v=>v.type===k).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
export function forecastForDate(data,date,now=new Date()){
 if(!data||date<localDate(data.timezone,now))return null;
 const i=data.daily.time.indexOf(date);if(i<0)return null;
 const result={date,code:data.daily.weather_code?.[i],high:data.daily.temperature_2m_max?.[i],low:data.daily.temperature_2m_min?.[i],rain:data.daily.precipitation_probability_max?.[i]};
 return [result.code,result.high,result.low,result.rain].every(v=>v==null)?null:result;
}
export function weatherKind(code){
 if(code===0)return 'clear';if([1,2].includes(code))return 'partly';if(code===3)return 'cloudy';if([45,48].includes(code))return 'fog';
 if([51,53,55,56,57].includes(code))return 'drizzle';if([61,63,65,66,67,80,81,82].includes(code))return 'rain';
 if([71,73,75,77,85,86].includes(code))return 'snow';if([95,96,99].includes(code))return 'storm';return 'unknown';
}
export function weatherWarnings(day){return [...(day&&(day.rain>=60||['rain','storm','drizzle'].includes(weatherKind(day.code)))?['rainWarning']:[]),...(day?.high>=35?['heatWarning']:[])];}
