import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const city of ['南京','长沙']){
  await page.goto('http://localhost:5174',{waitUntil:'domcontentloaded'});
  await expect(page.getByLabel('Data source')).toHaveValue('live');
  await page.getByPlaceholder('搜索城市，例如：杭州 / 北京 / 成都').fill(city);
  await page.getByRole('button',{name:/生成我的行程/}).click();
  await expect(page.locator('.result-heading h1')).toContainText(city,{timeout:150000});
  await expect(page.locator('.timeline-item').first()).toBeVisible();
  const names=await page.locator('.place-summary>strong').allTextContents();
  expect(names.every(n=>!n.includes('演示'))).toBe(true);
  console.log(city,'真实地点:',names);
  await expect(page.locator('.live-plan-note')).toContainText('高德真实查询');
  await expect(page.locator('.timeline-item').first()).toContainText('暂无评分');
  await expect(page.locator('.timeline-item').first()).toContainText('拥挤度未知');
  await expect(page.locator('.pathly-map-marker').first()).toBeVisible({timeout:45000});
  await page.getByRole('tab',{name:/松弛型/}).click();
  expect(await page.locator('.timeline-item').count()).toBeLessThan(names.length);
  await page.getByRole('tab',{name:/避峰型/}).click();
  await expect(page.locator('.style-explanation')).toContainText('避峰数据不足');
  if(city==='南京'){
    await mkdir('test-results',{recursive:true});
    await page.screenshot({path:'test-results/nanjing-live.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:'test-results/nanjing-live-mobile.png',fullPage:true});
    await page.setViewportSize({width:1280,height:900});
  }
 }
 expect(errors).toEqual([]);console.log('PASS: 南京、长沙默认真实规划、三种风格、地图标记、未知数据标注、移动端。');
}catch(e){console.error(e.message.replace(/[a-f0-9]{32}/gi,'[redacted]').replace(/https?:\/\/\S+/g,'[url]'));process.exitCode=1;}finally{await browser.close();}
