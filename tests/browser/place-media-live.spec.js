import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test('real provider media renders in all seven activity cards',async({page})=>{
 test.setTimeout(120000);await page.goto('/');
 const records=JSON.parse(fs.readFileSync('reports/place-media/live.json','utf8'));
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
 fs.writeFileSync('reports/place-media/browser.json',JSON.stringify(results,null,2));await page.screenshot({path:'reports/place-media/cards.png',fullPage:true});
 expect(results.filter(r=>r.loaded).length).toBe(records.length);
});
test('Tokyo real places retain photos after itinerary regeneration and refresh',async({page})=>{
 test.setTimeout(90000);
 const main=await(await page.request.get('/src/main.js')).text(),vue=main.match(/from "([^"]*vue.js[^"]*)"/)[1];
 const records=JSON.parse(fs.readFileSync('reports/place-media/live.json','utf8')).slice(0,3);
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
