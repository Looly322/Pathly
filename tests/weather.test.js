import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastForDate,localDate,weatherKind,weatherWarnings,weatherCoordinates,getWeather} from '../src/services/weatherService.js';
const data={timezone:'Asia/Tokyo',daily:{time:['2026-10-16','2026-10-17'],temperature_2m_max:[25,30],temperature_2m_min:[15,20],weather_code:[0,63],precipitation_probability_max:[0,70]}};
test('forecast matches exact trip date and destination day, including midnight and missing dates',()=>{
 const now=new Date('2026-10-15T16:00:00Z');assert.equal(localDate('Asia/Tokyo',now),'2026-10-16');assert.equal(localDate('America/New_York',now),'2026-10-15');
 assert.equal(forecastForDate(data,'2026-10-17',now).high,30);assert.equal(forecastForDate(data,'2026-11-01',now),null);assert.equal(forecastForDate(data,'2026-10-15',now),null);
 assert.equal(forecastForDate({...data,daily:{time:['2026-10-16']}},'2026-10-16',now),null);
});
test('WMO codes, null values and weather reminders are not invented',()=>{
 assert.equal(weatherKind(null),'unknown');assert.equal(weatherKind(95),'storm');assert.deepEqual(weatherWarnings({rain:null,high:null}),[]);assert.deepEqual(weatherWarnings({rain:70,high:36}),['rainWarning','heatWarning']);
});
test('weather coordinates leave WGS84 intact and convert domestic GCJ02 only for weather',()=>{
 assert.deepEqual(weatherCoordinates({latitude:48.8566,longitude:2.3522}),{latitude:48.8566,longitude:2.3522});
 const result=weatherCoordinates({latitude:39.9104,longitude:116.4136,coordinateSystem:'GCJ02'});assert.ok(Math.abs(result.latitude-39.909)<.002);assert.ok(Math.abs(result.longitude-116.4074)<.002);
 assert.throws(()=>weatherCoordinates({latitude:NaN,longitude:0}));
});
test('weather in-flight requests deduplicate and short cache prevents repeat calls',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({...data,fetchedAt:Date.now()/1000})}};
 try{const p={latitude:35.6762,longitude:139.6503};await Promise.all([getWeather(p),getWeather(p)]);await getWeather(p);assert.equal(calls,1);}finally{globalThis.fetch=original;}
});
