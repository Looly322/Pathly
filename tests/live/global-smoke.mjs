import { chromium, expect } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
const browser = await chromium.launch({channel:'chrome',headless:true});
const page = await browser.newPage({viewport:{width:1280,height:900}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
const reports=[];
try {
  await page.goto('http://localhost:5173');
  await page.getByPlaceholder('搜索城市，例如：杭州 / 北京 / 成都').fill('北京');
  await page.getByRole('button',{name:/生成我的行程/}).click();
  await expect(page.locator('.result-heading h1')).toContainText('北京',{timeout:150000});
  await expect(page.locator('.timeline-item').first()).toBeVisible({timeout:60000});
  const names=await page.locator('.place-summary strong').allTextContents();
  expect(names.length).toBeGreaterThanOrEqual(3);
  reports.push({city:'北京',source:'amap',names});
  console.log('北京',names);
  await page.getByRole('button',{name:'探索全球目的地',exact:true}).click();
  await page.getByLabel('旅行目的地',{exact:true}).fill('巴黎');
  await page.getByRole('button',{name:'查找城市',exact:true}).click();
  await page.getByRole('button',{name:/Paris.*France/}).first().click({timeout:60000});
  await expect(page.locator('.global-place').first()).toBeVisible({timeout:60000});
  await page.getByLabel('搜索地点',{exact:true}).fill('卢浮宫');
  await page.getByRole('button',{name:'搜索地点',exact:true}).click();
  await expect(page.locator('.global-place').first()).toContainText('Louvre',{timeout:60000});
  reports.push({city:'巴黎',source:'foursquare',names:await page.locator('.global-place h3').allTextContents()});
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/global-desktop.png',fullPage:true});
  await page.setViewportSize({width:320,height:800});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/global-mobile.png',fullPage:true});
  expect(errors).toEqual([]);
  await writeFile('backend/global-browser-results.json',JSON.stringify(reports,null,2));
  console.log('PASS: Beijing AMap + Paris Foursquare + Chinese POI + 320px + console');
} catch(e) { console.error(e.message.replace(/[a-f0-9]{32}/gi,'[redacted]')); process.exitCode=1; }
finally { await browser.close(); }
