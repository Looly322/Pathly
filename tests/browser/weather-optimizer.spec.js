import {test,expect} from '@playwright/test';
// 受控天气/营业时间仅为测试夹具；生产从 Open-Meteo 读取，绝不生成此数据。
const cities=[['北京','CN','Asia/Shanghai',28800,[39.924,116.397],[39.916,116.397]],['巴黎','FR','Europe/Paris',7200,[48.863,2.327],[48.861,2.336]],['东京','JP','Asia/Tokyo',32400,[35.715,139.774],[35.719,139.776]]];
async function mount(page,city,wet=true,hours=true){
 await page.clock.setFixedTime(new Date('2026-10-16T00:00:00Z'));
 const main=await(await page.request.get('/src/main.js')).text(),vue=main.match(/from "([^"]*vue.js[^"]*)"/)[1];
 const source=await(await page.request.get('/src/views/TripResultView.vue')).text(),i18n=source.match(/from "([^"]*i18n\/index.js[^"]*)"/)[1];
 const time=[],temperature_2m=[],wind_speed_10m=[],precipitation_probability=[];
 for(let h=0;h<24;h++){time.push('2026-10-17T'+String(h).padStart(2,'0')+':00');temperature_2m.push(25);wind_speed_10m.push(10);precipitation_probability.push(wet&&h===9?90:0);}
 await page.route('**/api/weather?**',r=>r.fulfill({json:{timezone:city[2],utc_offset_seconds:city[3],fetchedAt:Date.parse('2026-10-16T00:00:00Z')/1000,current:{time:'2026-10-16T08:00',temperature_2m:25,weather_code:0,wind_speed_10m:10},daily:{time:['2026-10-17']},hourly:{time,temperature_2m,wind_speed_10m,precipitation_probability}}}));
 await page.route('**/api/places/localize?**',r=>r.fulfill({json:{photoStatus:'missing'}}));
 await page.route('https://tiles.openfreemap.org/**',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#fff'}}]}}));
 const places=['park','museum'].map((id,i)=>({id,name:id,category:i?'CULTURE':'NATURE',environment:i?'indoor':'outdoor',subcategories:['CULTURE','NATURE'],latitude:city[4+i][0],longitude:city[4+i][1],estimatedDuration:90,minimumDuration:60,price:0,quality:i?0:3,...(hours?{openingHours:{weekly:Object.fromEntries(Array.from({length:7},(_,d)=>[d,[{start:'07:00',end:'21:00'}]]))}}:{})}));
 await page.route('**/weather-opt-test',r=>r.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><link rel="stylesheet" href="/src/style.css"><div id="app"></div><script type="module">import {createApp,h} from '${vue}';import Result from '/src/views/TripResultView.vue';import {setLanguage} from '${i18n}';window.lang=setLanguage;createApp({render:()=>h(Result,{settings:{date:'2026-10-17',days:1,start:'08:00',end:'20:00',walking:'high',party:'solo',budget:1000,pace:'balanced',interests:['NATURE','CULTURE'],mustIds:[]},destination:{id:'test-city',displayName:'${city[0]}',city:'${city[0]}',countryCode:'${city[1]}',latitude:${city[4][0]},longitude:${city[4][1]}},places:${JSON.stringify(places)},pending:[],limited:false})}).mount('#app');</script>`}));
 await page.goto('/weather-opt-test');await expect(page.locator('.trip-event:not(.support-event)')).toHaveCount(2);await expect(page.locator('.weather-panel')).toHaveAttribute('aria-busy','false');
}
for(const city of cities){
 test(`${city[0]} rainy: preview, consent, timeline/map order, undo and lock`,async({page})=>{
  await mount(page,city);const names=page.locator('.trip-event:not(.support-event) h3');await expect(names.first()).toHaveText('park');
  await expect(page.locator('.event-weather-risk').first()).toContainText('降雨');await page.getByRole('button',{name:'根据天气优化',exact:true}).click();await expect(page.locator('.weather-preview')).toBeVisible();await expect(names.first()).toHaveText('park');
  await page.getByRole('button',{name:'确认应用调整',exact:true}).click();await expect(names.first()).toHaveText('museum');
  if(city[1]==='CN'){await expect(page.locator('.pathly-map-marker')).toHaveCount(2,{timeout:30000});}else{await expect(page.locator('.global-pin').first()).toHaveAttribute('aria-label','1. museum');}
  await page.getByRole('button',{name:/撤销/}).click();await expect(names.first()).toHaveText('park');
  const time=await page.locator('#event-park .event-time').innerText();await page.locator('#event-park').getByRole('button',{name:'锁定',exact:true}).click();await page.getByRole('button',{name:'根据天气优化',exact:true}).click();await expect(page.locator('.weather-advice')).toContainText('未找到');expect(await page.locator('#event-park .event-time').innerText()).toBe(time);
  await page.evaluate(()=>window.lang('en'));await expect(page.getByRole('button',{name:'Optimize for weather',exact:true})).toBeVisible();
 });
 test(`${city[0]} sunny: no unnecessary adjustment`,async({page})=>{await mount(page,city,false);await expect(page.getByRole('button',{name:'根据天气优化',exact:true})).toBeDisabled();await expect(page.locator('.weather-advice')).toContainText('未发现明显风险');});
}
test('unknown opening hours require explicit verification before applying',async({page})=>{
 await mount(page,cities[1],true,false);await page.getByRole('button',{name:'根据天气优化',exact:true}).click();await expect(page.getByRole('button',{name:'确认应用调整',exact:true})).toBeDisabled();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'确认应用调整',exact:true}).click();await expect(page.locator('.trip-event:not(.support-event) h3').first()).toHaveText('museum');
});
