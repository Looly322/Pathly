// Replays real saved Open-Meteo responses at their retrieval time; does not fabricate weather.
import fs from 'node:fs';
import {scheduleDay} from '../../src/planner/planner.js';
import {assessWeather,optimizeWeather} from '../../src/planner/weatherOptimizer.js';
const settings={start:'09:00',end:'20:00',walking:'high',party:'solo',interests:['NATURE','CULTURE'],mustIds:[],budget:1000};
const cities=[['北京',['天坛公园',39.882,116.406],['中国国家博物馆',39.905,116.401]],['巴黎',['杜伊勒里花园',48.863,2.327],['卢浮宫',48.861,2.336]],['东京',['上野公园',35.715,139.774],['东京国立博物馆',35.719,139.776]]];
const results=cities.map(([city,park,museum])=>{
 const data=JSON.parse(fs.readFileSync(`reports/weather/${city}.json`));
 const items=[park,museum].map(([name,latitude,longitude],i)=>({place:{id:name,name,latitude,longitude,category:i?'CULTURE':'NATURE',environment:i?'indoor':'outdoor',estimatedDuration:90,minimumDuration:60,price:null},duration:90}));
 const plan={id:'balanced',days:[{...scheduleDay(items,settings,'balanced'),day:1,date:data.daily.time[1]}]};
 const now=new Date(data.fetchedAt*1000),assessment=assessWeather(plan,data,now),result=optimizeWeather(plan,settings,data,now);
 return {city,timezone:data.timezone,forecastHours:data.hourly.time.length,date:plan.days[0].date,complete:assessment.complete,affected:assessment.affected.map(v=>({name:v.event.place.name,reasons:v.risk.reasons})),proposal:!!result.plan,reason:result.reason||'conditional proposal',note:'Real forecast snapshot; visit durations are planning allowances. No opening hours fabricated.'};
});
fs.writeFileSync('reports/weather/optimization-real.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
