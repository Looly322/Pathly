// 真实浏览器六城验收：不替换 API 响应，不输出密钥或带认证参数的 URL。
import {chromium,expect} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];await mkdir('test-results',{recursive:true});
for(const city of (process.argv.slice(2).length?process.argv.slice(2):['北京','东京','巴黎','开罗','马拉喀什','库斯科'])){
 const page=await browser.newPage({viewport:{width:1280,height:900}});const row={city,days:[]},errors=[];let leaks=0;
 page.on('pageerror',e=>errors.push(e.name));page.on('request',r=>{if(/api\.opentripmap\.com|foursquare\.com/.test(r.url()))leaks++;});
 try{
  await page.goto('http://localhost:5173/');await page.getByLabel('目的地城市',{exact:true}).fill(city);
  await page.getByRole('button',{name:'✓ 美食',exact:true}).click();await page.getByRole('button',{name:'自然',exact:true}).click();
  await page.getByRole('button',{name:'生成我的行程 ↗',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog.or(page.locator('.trip-result'))).toBeVisible({timeout:90000});
  if(await dialog.isVisible())await dialog.locator('.city-option').first().click();
  await expect(page.locator('.trip-result')).toBeVisible({timeout:110000});
  await expect(page.locator('.trip-days button')).toHaveCount(3);
  const ids=[];
  for(let n=0;n<3;n++){
   await page.locator('.trip-days button').nth(n).click();
   const cards=page.locator('.trip-event:not(.support-event)');const names=await cards.locator('h3').allTextContents();
   expect(names.length).toBeGreaterThanOrEqual(2);expect(names.length).toBeLessThanOrEqual(4);
   ids.push(...await cards.evaluateAll(xs=>xs.map(x=>x.id)));
   await expect(page.locator('#event-LUNCH')).toBeVisible();await expect(page.locator('#event-DINNER')).toBeVisible();
   await expect(page.locator('.daily-timeline [role=alert]')).toHaveCount(0);
   row.days.push({names,mainActivities:names.length});
  }
  expect(new Set(ids).size).toBe(ids.length);expect(errors).toEqual([]);expect(leaks).toBe(0);
  await expect(page.locator('.leaflet-container,.amap-container')).toBeVisible({timeout:30000});
  await expect(page.locator('.leaflet-container,.amap-container')).toBeVisible({timeout:30000});
  row.status='passed';row.map=await page.locator('.leaflet-container,.amap-container').count();
  await page.locator('.trip-days button').first().click();
  await page.screenshot({path:'test-results/otm-'+city+'.png',fullPage:true});
 }catch(e){row.status='failed';row.visibleError=await page.locator('[role=alert]').allTextContents();row.error=e.message.replace(/https?:\/\/\S+/g,'[url]').slice(0,700);}
 row.pageErrors=errors;results.push(row);console.log(JSON.stringify(row));await writeFile(process.argv.length>2?'backend/otm-browser-recheck.json':'backend/otm-browser-results.json',JSON.stringify(results,null,2));await page.close();
}
await browser.close();if(results.some(r=>r.status!=='passed'))process.exitCode=1;
