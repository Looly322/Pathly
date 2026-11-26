import {test,expect} from '@playwright/test';
const cases=[['东京',4,['美食','购物','城市漫步']],['巴黎',4,['艺术','美食']],['开罗',3,['历史文化','美食']],['纽约',3,['购物','美食','城市漫步']]];
test.beforeEach(async({page})=>{
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
 await expect(dialog).toBeVisible({timeout:65000});
 await dialog.locator('.city-option').first().click();
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
  await expect(first.locator('.event-time')).toHaveText(time);
 }
 await page.setViewportSize({width:360,height:800});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.locator('.trip-days button').first()).toContainText('Day 1');
 expect(forbidden).toEqual([]);expect(errors).toEqual([]);
 console.log(JSON.stringify({city,days,actualActivities:counts}));
});
