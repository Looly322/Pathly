import {test,expect} from '@playwright/test';
test('independent text, bounded media, date changes and language fallback',async({page})=>{
 test.setTimeout(40000);
 const main=await(await page.request.get('/src/main.js')).text(),vue=main.match(/from "([^"]*vue.js[^"]*)"/)[1];
 const component=await(await page.request.get('/src/views/TripResultView.vue')).text(),i18n=component.match(/from "([^"]*i18n\/index.js[^"]*)"/)[1];
 await page.route('**/src/components/UnifiedTripMap.vue*',r=>r.fulfill({contentType:'text/javascript',body:'export default {template:"<div>Map isolated in regression</div>"}'}));
 await page.route('**/src/components/TripTransport.vue*',r=>r.fulfill({contentType:'text/javascript',body:'export default {template:"<div/>"}'}));
 const calls=[];let release;const gate=new Promise(r=>release=r);
 await page.route('**/api/otm/details?**',async r=>{
  const q=new URL(r.request().url()).searchParams,part=q.get('part');calls.push(q.toString());
  if(part==='photo'){await gate;try{await r.abort()}catch{}return;}
  await r.fulfill({json:part==='base'?{description:'Original English introduction. '.repeat(30),descriptionLanguage:'en',website:'https://www.toureiffel.paris/'}:{nameZh:'埃菲尔铁塔'}});
 });
 await page.route('**/quality-test',r=>r.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><div id="app"></div><script type="module">
 import {createApp,h} from '${vue}';import Result from '/src/views/TripResultView.vue';import {normalizePlace} from '/src/planner/place.js';import {setLanguage} from '${i18n}';window.lang=setLanguage;
 createApp({render:()=>h(Result,{settings:{date:'2026-10-15',days:3,start:'09:00',end:'20:00',budget:500,interests:['CULTURE','FOOD'],walking:'high',party:'solo',mustIds:['tower'],pace:'balanced'},destination:{id:'paris',city:'Paris',displayName:'巴黎',canonicalName:'Paris',countryCode:'FR',latitude:48.8584,longitude:2.2945},places:[normalizePlace({id:'tower',sourceId:'test-tower',source:'opentripmap',name:'Eiffel Tower',category:'CULTURE',latitude:48.8584,longitude:2.2945,subcategories:['CULTURE']})],pending:[],limited:false})}).mount('#app');</script>`}));
 await page.goto('/quality-test');await expect(page.locator('.trip-days button')).toHaveCount(3);
 await expect(page.locator('.trip-event h3').first()).toHaveText('埃菲尔铁塔');
 await expect(page.locator('.place-description')).toContainText('以下为来源原文');
 await expect(page.locator('.place-description .clamped')).toBeVisible();
 await page.getByRole('button',{name:'展开介绍'}).click();await expect(page.locator('.place-description .clamped')).toHaveCount(0);
 await page.locator('.trip-days button').nth(1).click();await page.locator('.trip-days button').first().click();
 await expect(page.locator('.activity-image [role=status]')).toHaveCount(0,{timeout:18000});
 await expect(page.locator('.category-art')).toContainText('非实拍');
 expect(new Set(calls).size).toBe(calls.length);
 await page.evaluate(()=>window.lang('en'));await expect(page.locator('.trip-event h3').first()).toHaveText('Eiffel Tower');
 await expect(page.locator('.place-description')).not.toContainText('以下为来源原文');
 await expect(page.locator('.review-button').first()).toContainText('View traveler reviews');release();
});
