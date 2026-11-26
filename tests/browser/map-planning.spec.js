import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixture=readFileSync(new URL('../fixtures/amap-sdk.js',import.meta.url),'utf8');
async function enter(page){await page.goto('/');await page.getByPlaceholder('搜索城市，例如：杭州 / 北京 / 成都').fill('杭州');await page.getByRole('button',{name:/我自己在地图上选/}).click();}
async function useFixture(page){await page.route('**/src/services/amapService.js*',r=>r.fulfill({contentType:'text/javascript',body:fixture}));}
async function find(page,name){await page.getByRole('textbox',{name:'搜索地点',exact:true}).fill(name);await page.getByRole('button',{name:'搜索地点',exact:true}).click();await expect(page.locator('.poi-result h3')).toHaveText(name);}
test('map selection, custom points, locks, order, deletion, theme and lifecycle',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await useFixture(page);await enter(page);
 await expect(page.getByText('已定位：杭州',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'帮我规划这些地点',exact:false}).click();await expect(page.getByRole('alert')).toHaveText('请至少选择 2 个地点。');
 for(const name of ['西湖','小河直街','灵隐寺']){await find(page,name);await page.locator('.poi-result').getByRole('button',{name:'加入行程',exact:true}).click();}
 await expect(page.locator('.selected-place')).toHaveCount(3);await expect(page.locator('.pathly-map-marker')).toHaveCount(3);
 const first=page.locator('.selected-place').first();await first.getByRole('button',{name:'必去地点',exact:true}).click();await expect(first.getByRole('button',{name:'删除',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'添加自定义地点',exact:true}).click();await page.locator('.amap-container').click({position:{x:280,y:210}});
 await expect(page.getByRole('dialog')).toBeVisible();await page.getByLabel('地点名称').fill('日落拍照点');await page.getByRole('button',{name:'90 分钟',exact:true}).click();await page.getByLabel('必去地点',{exact:true}).check();await page.getByRole('button',{name:'保存并加入行程',exact:true}).click();
 await expect(page.locator('.selected-place')).toHaveCount(4);await expect(page.locator('.pathly-map-marker')).toHaveCount(4);await expect(page.getByRole('button',{name:'添加自定义地点',exact:true})).toBeVisible();
 await page.locator('.amap-container').click({position:{x:280,y:210}});await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'帮我规划这些地点',exact:false}).click();await expect(page.locator('.route-order')).toHaveText('1 → 2 → 3 → 4');
 const state=await page.evaluate(()=>({path:window.__amapFixture.lines.at(-1).options.path,count:window.__amapFixture.maps.length}));expect(state.path).toHaveLength(4);expect(state.count).toBe(1);
 const before=JSON.stringify(state.path);await page.locator('.selected-place').nth(1).getByRole('button',{name:'下移',exact:true}).click();expect(await page.evaluate(()=>JSON.stringify(window.__amapFixture.lines.at(-1).options.path))).not.toBe(before);
 await page.getByRole('button',{name:/主题/}).click();await page.getByRole('button',{name:'Ocean',exact:false}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();expect(await page.evaluate(()=>window.__amapFixture.lines.at(-1).options.strokeColor)).toBe('#086f88');
 await page.locator('.selected-place').filter({hasText:'灵隐寺'}).locator('.selected-place-main').click();await expect(page.locator('.map-place-popup h3')).toHaveText('灵隐寺');
 await page.locator('.selected-place').filter({hasText:'灵隐寺'}).getByRole('button',{name:'删除',exact:true}).click();await expect(page.locator('.pathly-map-marker')).toHaveCount(3);await expect(page.locator('.map-place-popup')).toHaveCount(0);
 await page.locator('.pathly-map-marker').first().click();await expect(page.locator('.selected-place').first()).toHaveClass(/active/);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await page.locator('.amap-container').boundingBox()).height).toBeGreaterThan(300);
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.getByRole('button',{name:'Plan these places',exact:false})).toBeVisible();
 await page.getByRole('button',{name:/Back to preferences/}).click();expect(await page.evaluate(()=>window.__amapFixture.maps[0].destroyed)).toBe(true);await expect(page.getByRole('button',{name:/Create my itinerary/})).toBeVisible();expect(errors).toEqual([]);
});
test('city changes isolate selections and stale searches, empty/error results work',async({page})=>{
 await useFixture(page);await enter(page);await find(page,'西湖');await page.locator('.poi-result').getByRole('button',{name:'加入行程',exact:true}).click();
 await page.getByRole('textbox',{name:'搜索地点',exact:true}).fill('慢结果');await page.getByRole('button',{name:'搜索地点',exact:true}).click();
 await page.getByLabel('目的地城市').fill('成都');await page.getByRole('button',{name:'定位城市',exact:true}).click();await expect(page.getByText('已定位：成都',{exact:true})).toBeVisible();await expect(page.locator('.selected-place')).toHaveCount(0);await page.waitForTimeout(300);await expect(page.locator('.poi-result')).toHaveCount(0);
 for(const [term,message] of [['无结果','没有找到相关地点。'],['搜索失败','地点搜索失败，请检查网络或 Key 权限后重试。']]){await page.getByRole('textbox',{name:'搜索地点',exact:true}).fill(term);await page.getByRole('button',{name:'搜索地点',exact:true}).click();await expect(page.getByText(message,{exact:true})).toBeVisible();}
 expect(await page.evaluate(()=>window.__amapFixture.queries.at(-1).citylimit)).toBe(true);expect(await page.evaluate(()=>window.__amapFixture.queries.at(-1).city)).toBe('510100');
 await page.getByLabel('目的地城市').fill('杭州');await page.getByRole('button',{name:'定位城市',exact:true}).click();await expect(page.locator('.selected-place')).toHaveCount(1);
 await page.getByRole('button',{name:'添加自定义地点',exact:true}).click();await page.getByRole('button',{name:'退出标记模式',exact:true}).click();await page.locator('.amap-container').click({position:{x:280,y:210}});await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByLabel('目的地城市').fill('不存在城市');await page.getByRole('button',{name:'定位城市',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'未能定位该城市'})).toBeVisible();await expect(page.getByRole('textbox',{name:'搜索地点',exact:true})).toBeDisabled();
});
test('missing key and loader failures show useful states without breaking home',async({page})=>{
 await page.route('**/src/services/amapService.js*',r=>r.fulfill({contentType:'text/javascript',body:'export function isAmapConfigured(){return false;} export async function loadAmap(){throw new Error("AMAP_NOT_CONFIGURED")} export function withTimeout(p){return p;}'}));
 await enter(page);await expect(page.getByText('地图服务尚未配置',{exact:true})).toBeVisible();await page.getByRole('button',{name:/返回旅行需求/}).click();await expect(page.getByRole('heading',{name:'下一站，想去哪？'})).toBeVisible();
 await page.unroute('**/src/services/amapService.js*');await page.route('**/src/services/amapService.js*',r=>r.fulfill({contentType:'text/javascript',body:'export function isAmapConfigured(){return true;} export async function loadAmap(){throw new Error("AMAP_LOAD_FAILED")} export function withTimeout(p){return p;}'}));
 await enter(page);await expect(page.getByText('地图加载失败，请稍后重试。',{exact:true})).toBeVisible();await page.getByRole('button',{name:'重试加载',exact:true}).click();await expect(page.getByText('地图加载失败，请稍后重试。',{exact:true})).toBeVisible();
});
