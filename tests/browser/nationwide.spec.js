import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixture=readFileSync(new URL('../fixtures/amap-sdk.js',import.meta.url),'utf8');
test.beforeEach(async({page})=>{await page.route('**/src/services/amapService.js*',r=>r.fulfill({contentType:'text/javascript',body:fixture}));await page.goto('/',{waitUntil:'domcontentloaded'});});
test('default generation queries arbitrary cities and districts with real-source POIs, no fabricated facts',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [city,code] of [['南京','320100'],['玄武区','320102']]){
  await expect(page.getByLabel('Data source')).toHaveValue('live');
  await page.getByPlaceholder('搜索城市，例如：杭州 / 北京 / 成都').fill(city);
  await page.getByRole('button',{name:/生成我的行程/}).click();
  await expect(page.locator('.result-heading h1')).toContainText(city);
  await expect(page.locator('.timeline-item').first()).toContainText('暂无评分');
  await expect(page.locator('.timeline-item').first()).toContainText('拥挤度未知');
  await expect(page.locator('.timeline-item').first()).toContainText('未核实');
  expect(await page.locator('.timeline').innerText()).not.toMatch(/演示|NaN/);
  await expect(page.locator('.pathly-map-marker').first()).toBeVisible();
  expect(await page.evaluate(()=>window.__amapFixture.queries.filter(q=>q.type).every(q=>q.citylimit))).toBe(true);
  expect(await page.evaluate(()=>window.__amapFixture.queries.filter(q=>q.type).at(-1).city)).toBe(code);
  await page.getByRole('tab',{name:/避峰型/}).click();
  await expect(page.locator('.style-explanation')).toContainText('避峰数据不足');
  await expect(page.locator('.tab-metrics').first()).toContainText('未知');
  await page.locator('.place-main').first().click();
  await expect(page.getByRole('dialog')).toContainText('未提供，请出发前核实');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/修改需求/}).click();
 }
 expect(errors).toEqual([]);
});
test('API failure has no silent demo fallback; changing city cancels outdated generation',async({page})=>{
 await page.getByPlaceholder('搜索城市，例如：杭州 / 北京 / 成都').fill('南京');
 await page.evaluate(()=>window.__amapFixture.failDiscovery=true);
 await page.getByRole('button',{name:/生成我的行程/}).click();
 await expect(page.getByRole('alert')).toContainText('地点查询失败');
 await expect(page.locator('.result-heading')).toHaveCount(0);
 await page.evaluate(()=>window.__amapFixture.failDiscovery=false);
 await page.getByRole('button',{name:/生成我的行程/}).click();
 await page.getByRole('button',{name:'取消查询',exact:true}).click();
 await page.getByPlaceholder('搜索城市，例如：杭州 / 北京 / 成都').fill('长沙');
 await page.waitForTimeout(1500);
 await expect(page.locator('.result-heading')).toHaveCount(0);
 await expect(page.getByPlaceholder('搜索城市，例如：杭州 / 北京 / 成都')).toHaveValue('长沙');
});
