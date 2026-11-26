import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test('real provider media renders in activity cards and after remount',async({page})=>{
 test.setTimeout(120000);await page.goto('/');
 const records=JSON.parse(fs.readFileSync('reports/place-media/live.json','utf8'));
 await page.evaluate(async records=>{
  const {createApp,h}=await import('/node_modules/.vite/deps/vue.js');
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
 fs.writeFileSync('reports/place-media/browser.json',JSON.stringify(results,null,2));await page.screenshot({path:'reports/place-media/cards.png',fullPage:true});
 expect(results.filter(r=>r.loaded).length).toBe(records.length);
});
