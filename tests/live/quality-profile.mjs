import {chromium} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const rows=[];const phase=process.env.PROFILE_PHASE||'before';await mkdir('reports/quality',{recursive:true});
try{for(const city of (process.env.PROFILE_CITIES||'巴黎,东京,开罗,北京').split(',')){
 const page=await browser.newPage();const starts=new Map(),requests=[];let mark=0;
 page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))starts.set(r,performance.now())});
 page.on('requestfinished',async r=>{if(starts.has(r))requests.push({path:new URL(r.url()).pathname,ms:Math.round(performance.now()-starts.get(r)),status:(await r.response())?.status()})});
 page.on('requestfailed',r=>{if(starts.has(r))requests.push({path:new URL(r.url()).pathname,ms:Math.round(performance.now()-starts.get(r)),failed:true})});
 const row={city};try{
 await page.goto('http://localhost:5173/');await page.getByLabel('目的地城市',{exact:true}).fill(city);await page.getByLabel('旅行天数',{exact:true}).fill('3');mark=performance.now();await page.getByRole('button',{name:'生成我的行程 ↗',exact:true}).click();
 await page.locator('.destination-overlay,.trip-result,.form-error').first().waitFor({timeout:65000});
 if(await page.locator('.destination-overlay').count()){row.resolveMs=Math.round(performance.now()-mark);await page.locator('.city-option').first().click()}
 await page.locator('.trip-result').waitFor({timeout:65000});row.itineraryMs=Math.round(performance.now()-mark);
 await page.waitForTimeout(15000);
 row.activities=await page.locator('.trip-event:not(.support-event)').count();
 row.imageLoaded=await page.locator('.activity-image img').evaluateAll(imgs=>imgs.filter(i=>i.complete&&i.naturalWidth>0).length);
 row.loading=await page.getByText('正在恢复图片与中文名称…',{exact:true}).count();
 row.names=await page.locator('.trip-event:not(.support-event) h3').allTextContents();
 row.descriptionChars=await page.locator('.event-body').evaluateAll(nodes=>nodes.reduce((n,x)=>n+x.textContent.length,0));
 await page.screenshot({path:`reports/quality/${phase}-${city}.png`,fullPage:true});
 }catch(e){row.error=e.name;row.elapsedMs=Math.round(performance.now()-mark)}
 row.requests=requests;rows.push(row);await page.close();await writeFile(`reports/quality/${phase}.json`,JSON.stringify(rows,null,2));console.log(JSON.stringify(row));
}}finally{await browser.close()}
