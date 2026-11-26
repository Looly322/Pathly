import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const oldPlaces=JSON.parse(readFileSync('backend/data/current_places.json','utf8'));
const saoPlaces=JSON.parse(readFileSync('backend/osm-validation.json','utf8')).places;
import {readFileSync} from 'node:fs';
const oldPlaces=JSON.parse(readFileSync('backend/data/current_places.json','utf8'));
const saoPlaces=JSON.parse(readFileSync('backend/osm-validation.json','utf8')).places;
const cases=[['东京',4,['美食','购物','城市漫步']],['巴黎',4,['艺术','美食']],['开罗',3,['历史文化','美食']],['纽约',3,['购物','美食','城市漫步']]];
test.beforeEach(async({page})=>{
 // 功能回归使用既有真实地点快照；六城实时 OTM 验收由独立脚本执行。
 await page.route('**/api/otm/places?**',r=>{const q=new URL(r.request().url()).searchParams;const lat=+q.get('latitude'),lng=+q.get('longitude');const places=[...oldPlaces,...saoPlaces].filter(p=>Math.abs(p.latitude-lat)<.3&&Math.abs(p.longitude-lng)<.3).map(p=>({...p,photo:null,image:'http://localhost:5173/verified-test-photo.svg'}));return r.fulfill({json:{places}});});
 await page.route('**/api/open-places?**',r=>r.fulfill({json:{places:[]}}));
 await page.route('**/api/current-places?**',async route=>{const response=await route.fetch(),data=await response.json();data.places=data.places.map(p=>({...p,photo:null,image:null}));await route.fulfill({response,json:data});});
 await page.route('**/api/places/localize?**',r=>r.fulfill({json:{nameZh:null,photoStatus:'missing'}}));
 // 功能回归使用既有真实地点快照；六城实时 OTM 验收由独立脚本执行。
 await page.route('**/api/otm/places?**',r=>{const q=new URL(r.request().url()).searchParams;const lat=+q.get('latitude'),lng=+q.get('longitude');const places=[...oldPlaces,...saoPlaces].filter(p=>Math.abs(p.latitude-lat)<.3&&Math.abs(p.longitude-lng)<.3).map(p=>({...p,photo:null,image:'http://localhost:5173/verified-test-photo.svg'}));return r.fulfill({json:{places}});});
 await page.route('**/verified-test-photo.svg',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="green"/></svg>'}));
 await page.route('**/api/open-places?**',r=>r.fulfill({json:{places:[]}}));
 await page.route('**/api/current-places?**',async route=>{const response=await route.fetch(),data=await response.json();data.places=data.places.map(p=>({...p,photo:null,image:'http://localhost:5173/verified-test-photo.svg'}));await route.fulfill({response,json:data});});
 await page.route('**/api/places/localize?**',r=>r.fulfill({json:{nameZh:null,photoStatus:'missing'}}));
 // 自动回归只验证地图交互壳，真实瓦片在可见浏览器验证，不扫描公共底图。
 await page.route('https://tiles.openfreemap.org/**',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#eef0ed'}}]}}));
 // 海外测试不加载国内 SDK；目的地解析和本地真实 POI 快照仍走正在运行的后端。
 await page.route('**/src/services/cityService.js*',r=>r.fulfill({contentType:'text/javascript',body:'export async function resolveMapCity(){throw new Error("OVERSEAS_TEST")}'}));
});
for(const [city,days,interests] of cases)test(`${city}: actual existing POIs generate ${days} day itinerary without Foursquare`,async({page})=>{
 test.setTimeout(90000);
 const forbidden=[],errors=[];
 page.on('request',r=>{if(/foursquare\.com|\/api\/places\/search/.test(r.url()))forbidden.push('forbidden-provider');});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByLabel('目的地城市',{exact:true}).fill(city);
 await page.getByLabel('旅行天数',{exact:true}).fill(String(days));
 // 默认 CULTURE + FOOD；设置该用例所需兴趣。
 if(!interests.includes('历史文化'))await page.getByRole('button',{name:'✓ 历史文化',exact:true}).click();
 for(const interest of interests.filter(i=>!['历史文化','美食'].includes(i)))await page.getByRole('button',{name:interest,exact:true}).click();
 await page.getByRole('button',{name:'生成我的行程 ↗',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog.or(page.locator('.trip-result'))).toBeVisible({timeout:65000});
 if(await dialog.isVisible())await dialog.locator('.city-option').first().click();
 await expect(page.locator('.trip-result')).toBeVisible({timeout:30000});
 await expect(page.locator('.trip-days button')).toHaveCount(days);
 const counts=[];
 for(let d=0;d<days;d++){
  await page.locator('.trip-days button').nth(d).click();
  await expect(page.locator('#event-LUNCH')).toBeVisible();
  await expect(page.locator('#event-DINNER')).toBeVisible();
  expect(await page.locator('.trip-event:not(.support-event)').count()).toBeLessThanOrEqual(4);
  counts.push(await page.locator('.trip-event:not(.support-event) h3').allTextContents());
  await expect(page.locator('.daily-timeline [role=alert]')).toHaveCount(0);
 }
 await page.getByRole('button',{name:/高效游 每天/}).click();
 expect(await page.locator('.trip-event:not(.support-event)').count()).toBeLessThanOrEqual(5);
 const first=page.locator('.trip-event:not(.support-event)').first();
 if(await first.count()){
  const time=await first.locator('.event-time').innerText();
  await first.getByRole('button',{name:'+15',exact:true}).click();
  expect(await first.locator('.event-time').innerText()).not.toBe(time);
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();
  await expect(first.locator('.event-time')).toHaveText(time,{useInnerText:true});
 }
 await page.setViewportSize({width:360,height:800});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.locator('.trip-days button').first()).toContainText('Day 1');
 expect(forbidden).toEqual([]);expect(errors).toEqual([]);
 console.log(JSON.stringify({city,days,actualActivities:counts}));
});
test('failed photos show honest category artwork without removing valuable places',async({page})=>{
 await page.route('**/api/otm/places?**',r=>r.fulfill({json:{places:oldPlaces.filter(p=>p.countryCode==='FR').map(p=>({...p,photo:null,photos:[],image:'http://localhost:5173/image-failure-test.jpg'}))}}));
 await page.route('**/image-failure-test.jpg',r=>r.fulfill({status:404,body:''}));
 await page.goto('/');await page.getByLabel('目的地城市',{exact:true}).fill('巴黎');
 await page.getByRole('button',{name:'生成我的行程 ↗',exact:true}).click();
 await page.getByRole('dialog').locator('.city-option').first().click();
 await expect(page.locator('.trip-result')).toBeVisible();
 await expect(page.locator('.category-art').first()).toBeVisible();
 expect(await page.locator('.trip-event').count()).toBeGreaterThan(0);
});
test('presentation metadata restores photos, websites and shared localized labels without changing times',async({page})=>{
 let finish;const gate=new Promise(r=>finish=r);
 await page.route('**/api/places/localize?**',async r=>{
  await gate;
  const name=new URL(r.request().url()).searchParams.get('name');
  await r.fulfill({json:{nameZh:'中文测试名：'+name,photo:{url:'http://localhost:5173/test-photo.svg',author:'Test fixture',license:'Test',page:'https://commons.wikimedia.org/'}}});
 });
 await page.route('**/test-photo.svg',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="green"/></svg>'}));
 await page.goto('/');await page.getByLabel('目的地城市',{exact:true}).fill('纽约');
 await page.getByRole('button',{name:'生成我的行程 ↗',exact:true}).click();
 await expect(page.locator('.trip-result').or(page.getByRole('dialog'))).toBeVisible({timeout:65000});
 if(await page.getByRole('dialog').isVisible())await page.getByRole('dialog').locator('.city-option').first().click();
 const first=page.locator('.trip-event:not(.support-event)').first();
 await expect(first).toBeVisible();const time=await first.locator('.event-time').innerText();finish();
 await expect(first.locator('h3')).toContainText('中文测试名：');
 await expect(first.locator('img')).toBeVisible();
 expect(await first.locator('.event-time').innerText()).toBe(time);
 await expect(page.locator('.trip-event').getByRole('link',{name:'官方网站 ↗'}).first()).toBeVisible();
 await page.locator('.global-pin').first().click();
 await expect(page.locator('.maplibregl-popup-content').first()).toContainText('中文测试名：');
 const link=page.locator('a[href*="google.com/maps/dir"]').first();
 await expect(link).toContainText('中文测试名：');
 expect(new URL(await link.getAttribute('href')).searchParams.get('hl')).toBe('zh-CN');
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(first.locator('h3')).not.toContainText('中文测试名：');
});

 test('uncovered destination does not show fabricated complete plans or stability',async({page})=>{
 await page.route('**/api/otm/places?**',r=>r.fulfill({json:{places:[]}}));
 await page.goto('/');await page.getByLabel('目的地城市',{exact:true}).fill('巴黎');
 await page.getByRole('button',{name:'生成我的行程 ↗',exact:true}).click();
 await page.getByRole('dialog').locator('.city-option').first().click();
 await expect(page.locator('.trip-result')).toBeVisible();
 await expect(page.locator('.trip-result')).toContainText('无法生成完整行程');
 await expect(page.locator('.trip-stats')).toHaveCount(0);await expect(page.locator('.trip-paces')).toHaveCount(0);
 });

test('São Paulo real open data creates three days with meals',async({page})=>{
 test.setTimeout(90000);
 await page.route('**/api/open-places?**',r=>r.fulfill({json:{places:saoPlaces}}));
 const forbidden=[];page.on('request',r=>{if(/foursquare\.com/.test(r.url()))forbidden.push(r.url());});
 await page.goto('/');await page.getByLabel('目的地城市',{exact:true}).fill('圣保罗');
 await page.getByRole('button',{name:'自然',exact:true}).click();await page.getByRole('button',{name:'购物',exact:true}).click();
 await page.getByRole('button',{name:'生成我的行程 ↗',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog.or(page.locator('.trip-result'))).toBeVisible({timeout:65000});
 if(await dialog.isVisible())await dialog.locator('.city-option').filter({hasText:'Brazil'}).first().click();
 await expect(page.locator('.trip-result')).toBeVisible({timeout:35000});
 await expect(page.locator('.trip-days button')).toHaveCount(3);
 const names=[];
 for(const button of await page.locator('.trip-days button').all()){
  await button.click();expect(await page.locator('.trip-event:not(.support-event)').count()).toBeGreaterThan(0);
  await expect(page.locator('#event-LUNCH')).toBeVisible();await expect(page.locator('#event-DINNER')).toBeVisible();
  names.push(await page.locator('.trip-event:not(.support-event) h3').allTextContents());
 }
 expect(forbidden).toEqual([]);console.log(JSON.stringify({city:'São Paulo',days:names}));
});

 test('uncovered destination does not show fabricated complete plans or stability',async({page})=>{
 await page.route('**/api/otm/places?**',r=>r.fulfill({json:{places:[]}}));
 await page.goto('/');await page.getByLabel('目的地城市',{exact:true}).fill('巴黎');
 await page.getByRole('button',{name:'生成我的行程 ↗',exact:true}).click();
 await page.getByRole('dialog').locator('.city-option').first().click();
 await expect(page.locator('.trip-result')).toBeVisible();
 await expect(page.locator('.trip-result')).toContainText('无法生成完整行程');
 await expect(page.locator('.trip-stats')).toHaveCount(0);await expect(page.locator('.trip-paces')).toHaveCount(0);
 });
