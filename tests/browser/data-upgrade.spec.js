import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test('real provider media renders in all seven activity cards',async({page})=>{
 test.setTimeout(120000);await page.goto('/');
 const records=JSON.parse(fs.readFileSync('reports/data-upgrade/places-live.json','utf8')).filter(r=>r.data?.photo);
 await page.evaluate(async records=>{
  const source=await (await fetch('/src/components/ActivityImage.vue')).text();
  const vuePath=source.match(/from ["']([^"']*\/vue\.js[^"']*)["']/)[1];
  const {createApp,h}=await import(vuePath);
  const {default:ActivityImage}=await import('/src/components/ActivityImage.vue');
  document.body.innerHTML='<main id="media-audit" style="padding:24px;background:white;color:#203d35;display:flex;gap:24px;flex-wrap:wrap"></main>';
  createApp({render:()=>records.map((r,i)=>h('section',{'data-media':i,style:'width:150px'},[h('h3',r.data?.nameZh||r.name),h(ActivityImage,{place:{id:String(i),name:r.name,...r.data}})]))}).mount('#media-audit');
 },records);
 const results=[];
 for(let i=0;i<records.length;i++){
  const img=page.locator(`[data-media="${i}"] img`);
  try{await expect(img).toBeVisible({timeout:15000});await expect.poll(()=>img.evaluate(e=>e.complete&&e.naturalWidth>0),{timeout:20000}).toBe(true);results.push({name:records[i].name,loaded:true,url:await img.getAttribute('src')});}
  catch{results.push({name:records[i].name,loaded:false});}
 }
 fs.writeFileSync('reports/data-upgrade/browser.json',JSON.stringify(results,null,2));await page.screenshot({path:'reports/data-upgrade/cards.png',fullPage:true});
 expect(results.filter(r=>r.loaded).length).toBe(records.length);
});
test('actual weather panel separates forecasts and climate, switches language and survives failure',async({page})=>{
 test.setTimeout(90000);
 for(const [lat,lon] of [[35.6762,139.6503],[48.8566,2.3522],[51.5074,-.1278],[41.9028,12.4964]]){const r=await page.request.get('/api/weather?latitude='+lat+'&longitude='+lon);expect(r.ok()).toBe(true);}
 await page.goto('/');
 await page.evaluate(async()=>{
  const source=await(await fetch('/src/components/WeatherPanel.vue')).text();
  const {createApp,h}=await import(source.match(/from ["']([^"']*\/vue\.js[^"']*)["']/)[1]);
  const {default:Panel}=await import('/src/components/WeatherPanel.vue');
  document.body.innerHTML='<main id="audit" style="background:white;color:#203d35;padding:24px"></main>';
  window.weatherEvents=[];
  const cities=[['Tokyo',35.6762,139.6503,'2026-10-30'],['Paris',48.8566,2.3522,'2026-11-06'],['London',51.5074,-.1278,'2026-11-26'],['Rome',41.9028,12.4964,'2027-01-27']];
  createApp({render:()=>cities.map(([city,latitude,longitude,date])=>h('section',{'data-city':city},[h('h2',city),h(Panel,{destination:{city,latitude,longitude},dates:[date],onUpdate:e=>window.weatherEvents.push(e)})]))}).mount('#audit');
 });
 for(const city of ['Tokyo','Paris'])await expect(page.locator(`[data-city="${city}"] .weather-day`)).toContainText('未来天气预报',{timeout:30000});
 for(const city of ['London','Rome'])await expect(page.locator(`[data-city="${city}"] .weather-day`)).toContainText('历史同期气候参考',{timeout:30000});
 expect(await page.evaluate(()=>window.weatherEvents.some(e=>e.data?.days))).toBe(false);
 await page.screenshot({path:'reports/data-upgrade/weather.png',fullPage:true});
 await page.evaluate(async()=>{const src=await(await fetch('/src/components/WeatherPanel.vue')).text();(await import(src.match(/from ["']([^"']*i18n[^"']*)["']/)[1])).setLanguage('en')});
 await expect(page.locator('[data-city="London"]')).toContainText('Historical');
 await page.route('**/api/weather?*',r=>r.abort());await page.route('**/api/climate?*',r=>r.abort());
 await page.evaluate(async()=>{const {getClimate}=await import('/src/services/weatherService.js');window.failedClimate=await getClimate({latitude:0,longitude:0},['2027-01-27']).then(()=>false,()=>true);});
 expect(await page.evaluate(()=>window.failedClimate)).toBe(true);
});

test('Tokyo real places retain photos after itinerary regeneration and refresh',async({page})=>{
 test.setTimeout(90000);
 const main=await(await page.request.get('/src/main.js')).text(),vue=main.match(/from "([^"]*vue.js[^"]*)"/)[1];
 const records=JSON.parse(fs.readFileSync('reports/data-upgrade/places-live.json','utf8')).slice(0,3);
 // Isolate unrelated map/weather network calls; place data and photo bytes are real.
 await page.route('**/src/components/UnifiedTripMap.vue*',r=>r.fulfill({contentType:'text/javascript',body:'export default {template:"<div/>"}'}));
 await page.route('**/src/components/WeatherPanel.vue*',r=>r.fulfill({contentType:'text/javascript',body:'export default {template:"<div/>"}'}));
 await page.route('**/media-trip-test',r=>r.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><div id="app"></div><script type="module">
 import {createApp,h} from '${vue}';import Result from '/src/views/TripResultView.vue';import {normalizePlace} from '/src/planner/place.js';
 const records=${JSON.stringify(records)};
 createApp({render:()=>h(Result,{settings:{date:'2026-11-01',days:1,start:'09:00',end:'20:00',budget:500,interests:['CULTURE'],walking:'high',party:'solo',mustIds:records.map((_,i)=>'live-'+i),pace:'balanced'},destination:{id:'tokyo',city:'Tokyo',displayName:'东京',canonicalName:'Tokyo',countryCode:'JP',latitude:35.68,longitude:139.69},places:records.map((r,i)=>normalizePlace({id:'live-'+i,source:'verified-wikidata',name:r.name,latitude:r.params.latitude,longitude:r.params.longitude,wikidata:r.data.nameZhSourceId,...r.data,category:'CULTURE',subcategories:['CULTURE']})),pending:[],limited:false})}).mount('#app');</script>`}));
 for(let pass=0;pass<2;pass++){
  await page.goto('/media-trip-test');await expect(page.locator('.trip-result')).toBeVisible();
  const verify=async()=>{const imgs=page.locator('.activity-image img');expect(await imgs.count()).toBeGreaterThan(0);for(const img of await imgs.all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate(e=>e.complete&&e.naturalWidth>0),{timeout:15000}).toBe(true);}};
  await verify();await page.locator('.trip-actions button').last().click();await verify();
 }
});
