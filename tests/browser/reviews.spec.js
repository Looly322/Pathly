import {test,expect} from '@playwright/test';
const detail='https://www.tripadvisor.com/Attraction_Review-g14129730-d320047-Reviews-Tokyo_Tower-Shibakoen_Minato_Tokyo_Tokyo_Prefecture_Kanto.html';
const cases=[['Beijing','China',[['故宫博物院',39.916,116.397],['天坛',39.882,116.406]]],['Tokyo','Japan',[['Tokyo Tower',35.659,139.745],['Senso-ji',35.714,139.796]]],['Paris','France',[['Eiffel Tower',48.858,2.294],['Louvre Museum',48.861,2.336]]]];
for(const [city,country,items] of cases)test(`${city}: reviews on real itinerary cards, language, popup and edits`,async({page,context})=>{
 const main=await (await page.request.get('/src/main.js')).text();
 const vueUrl=main.match(/from "([^"]*vue.js[^"]*)"/)[1];
 const component=await (await page.request.get('/src/components/TouristReviews.vue')).text();
 const i18nUrl=component.match(/from "([^"]*i18n\/index.js[^"]*)"/)[1];
 const main=await (await page.request.get('/src/main.js')).text();
 const vueUrl=main.match(/from "([^"]*vue.js[^"]*)"/)[1];
 const component=await (await page.request.get('/src/components/TouristReviews.vue')).text();
 const i18nUrl=component.match(/from "([^"]*i18n\/index.js[^"]*)"/)[1];
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // 渲染生产结果页与真实规划器；固定地点输入使回归不消耗任何 POI 配额。
 await page.route('**/src/components/UnifiedTripMap.vue*',r=>r.fulfill({contentType:'text/javascript',body:'export default {template:"<div>Map test stub</div>"}'}));
 await page.route('**/src/components/TripTransport.vue*',r=>r.fulfill({contentType:'text/javascript',body:'export default {template:"<div>Transport test stub</div>"}'}));
 await page.route('**/api/**',r=>r.fulfill({json:{photoStatus:'missing'}}));
 const places=items.map(([name,latitude,longitude],i)=>({id:'review-'+i,name,latitude,longitude,source:'opentripmap',category:'CULTURE',subcategories:['CULTURE'],city,country,...(name==='Tokyo Tower'?{website:detail}:{}),rating:4.9,total_reviews:123456}));
 const settings={date:'2026-10-15',days:3,start:'09:00',end:'20:00',budget:500,interests:['CULTURE','FOOD'],walking:'high',party:'solo',mustIds:places.map(p=>p.id),pace:'balanced'};
 await page.route('**/reviews-test',r=>r.fulfill({contentType:'text/html',body:`<meta charset="UTF-8"><meta charset="UTF-8"><div id="app"></div><script type="module">
 import {createApp,h} from '${vueUrl}';
 import Result from '/src/views/TripResultView.vue';
 import {normalizePlace} from '/src/planner/place.js';
 import {setLanguage} from '${i18nUrl}';
 window.switchLanguage=setLanguage;
 createApp({render:()=>h(Result,{settings:${JSON.stringify(settings)},destination:${JSON.stringify({id:city,city,canonicalName:city,country,countryCode:'TEST',latitude:items[0][1],longitude:items[0][2]})},places:${JSON.stringify(places)}.map(p=>normalizePlace(p)),pending:[],limited:false})}).mount('#app');</script>`}));
 await page.goto('/reviews-test');
 await expect(page.locator('.trip-days button')).toHaveCount(3);
 let seen=0;
 for(let day=0;day<3;day++){
  await page.locator('.trip-days button').nth(day).click();
  expect(errors).toEqual([]);
  await expect(page.locator('.timeline-heading h2')).toHaveText(`第 ${day+1} 天`);
  expect(errors).toEqual([]);
  expect(errors).toEqual([]);
  await expect(page.locator('.timeline-heading h2')).toHaveText(`第 ${day+1} 天`);
  for(const link of await page.locator('.review-button').all()){
   const href=await link.getAttribute('href');
   expect(await link.getAttribute('target')).toBe('_blank');
   if(href!==detail){const q=new URL(href).searchParams.get('q');expect(q).toContain(city);expect(q).toContain(country);}
   await expect(link).toContainText('查看游客评价');seen++;
  }
 }
 expect(seen).toBe(2);
 await page.locator('.trip-days button').first().click();
 await expect(page.locator('.review-rating').first()).toHaveText('暂无评分数据');
 await expect(page.locator('.tourist-reviews')).not.toContainText(['123456']);
 const link=page.locator('.review-button').first();const href=await link.getAttribute('href');
 // 验证新标签页实际请求的 URL，不抓取第三方网页或评论。
 await context.route('https://www.tripadvisor.com/**',r=>r.fulfill({contentType:'text/html',body:'External navigation test'}));
 const popupPromise=page.waitForEvent('popup');await link.click();const popup=await popupPromise;await popup.waitForLoadState();expect(popup.url()).toBe(href);await popup.close();
 const time=await page.locator('.event-time').first().textContent();await page.getByRole('button',{name:'+15',exact:true}).first().click();expect(await page.locator('.event-time').first().textContent()).not.toBe(time);await page.getByRole('button',{name:/撤销/}).click();
 await page.evaluate(()=>window.switchLanguage('en'));
 await expect(page.locator('.review-button').first()).toContainText('View traveler reviews');
 await expect(page.locator('.review-rating').first()).toHaveText('No rating data available');
 expect(errors).toEqual([]);
});
