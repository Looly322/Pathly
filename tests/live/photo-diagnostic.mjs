import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const responses=[];
page.on('response',r=>{if(r.request().resourceType()==='image')responses.push({url:r.url(),status:r.status()})});
await page.goto('http://localhost:5173/');await page.getByLabel('目的地城市',{exact:true}).fill('巴黎');await page.getByRole('button',{name:'生成我的行程 ↗',exact:true}).click();await page.locator('.city-option').first().click({timeout:35000});await page.locator('.trip-result').waitFor();
await page.waitForTimeout(18000);const cards=page.locator('.trip-event:not(.support-event)');for(let i=0;i<await cards.count();i++)await cards.nth(i).scrollIntoViewIfNeeded();await page.waitForTimeout(12000);
const images=await page.locator('.activity-image').evaluateAll(nodes=>nodes.map(n=>({name:n.closest('article').querySelector('h3').textContent,url:n.querySelector('img')?.src,width:n.querySelector('img')?.naturalWidth,text:n.textContent})));
await writeFile('reports/quality/photo-diagnostic.json',JSON.stringify({images,responses},null,2));console.log(JSON.stringify(images));await browser.close();
