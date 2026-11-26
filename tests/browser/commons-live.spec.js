import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test('real provider media renders in all ten activity cards',async({page})=>{
 test.setTimeout(120000);await page.goto('/');
 const records=JSON.parse(fs.readFileSync('reports/commons-api/live.json','utf8'));
 expect(records).toHaveLength(10);for(const r of records)expect(r.data?.photo).toBeTruthy();
 await page.evaluate(async records=>{
  const source=await (await fetch('/src/components/ActivityImage.vue')).text();
  const vuePath=source.match(/from ["']([^"']*\/vue\.js[^"']*)["']/)[1];
  const {createApp,h}=await import(vuePath);
  const {default:ActivityImage}=await import('/src/components/ActivityImage.vue');
  document.body.innerHTML='<main id="media-audit" style="padding:24px;background:white;color:#203d35;display:flex;gap:24px;flex-wrap:wrap"></main>';
  createApp({render:()=>records.map((r,i)=>h('section',{'data-media':i,style:'width:150px'},[h('h3',r.data?.nameZh||r.name),h(ActivityImage,{place:{id:String(i),name:r.name,...r.data}})]))}).mount('#media-audit');
 },records);
 const results=[];
 for(let i=0;i<records.length;i++){
  const img=page.locator(`[data-media="${i}"] img`);
  try{await expect(img).toBeVisible({timeout:15000});await expect.poll(()=>img.evaluate(e=>e.complete&&e.naturalWidth>0),{timeout:20000}).toBe(true);results.push({name:records[i].name,loaded:true,url:await img.getAttribute('src')});}
  catch{results.push({name:records[i].name,loaded:false});}
 }
 fs.writeFileSync('reports/commons-api/browser.json',JSON.stringify(results,null,2));await page.screenshot({path:'reports/commons-api/cards.png',fullPage:true});
 expect(results.filter(r=>r.loaded).length).toBe(records.length);
});
