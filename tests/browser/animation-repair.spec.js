import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const dir='reports/animation-repair';
test('brand paths draw in sequence, curtain exits, reload does not replay, search works',async({page})=>{
 await page.setViewportSize({width:1440,height:950});await page.goto('/',{waitUntil:'commit'});await expect(page.locator('.brand-intro')).toBeVisible();
 await page.waitForTimeout(180);const early=await page.locator('.intro-signature path').evaluateAll(nodes=>nodes.map(n=>parseFloat(getComputedStyle(n).strokeDashoffset)));
 expect(early[0]).toBeLessThan(early.at(-1));expect(early.at(-1)).toBe(1);
 await expect(page.locator('.brand-intro')).toHaveCount(0,{timeout:4200});await expect(page.locator('main')).not.toHaveAttribute('inert','');
 await page.locator('.hero-search input').fill('巴黎');await page.locator('.hero-start').click();await expect(page.locator('#trip-planner .destination input')).toHaveValue('巴黎');
 await page.reload();await expect(page.locator('.brand-intro')).toHaveCount(0);expect(await page.evaluate(()=>sessionStorage.getItem('pathly:intro:v1'))).toBe('seen');
});
test('skip and reduced motion release controls immediately',async({page})=>{
 await page.goto('/',{waitUntil:'commit'});await page.getByRole('button',{name:'跳过开场'}).click();await expect(page.locator('.brand-intro')).toHaveCount(0);await page.locator('.hero-search input').fill('北京');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>sessionStorage.clear());await page.reload();await expect(page.locator('.brand-intro')).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});await page.locator('.poetic-theme').first().scrollIntoViewIfNeeded();await expect(page.locator('.poem-character').first()).toHaveCSS('opacity','1');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('all four walls animate characters, remember early input and move in two dimensions',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('pathly:intro:v1','seen'));await page.setViewportSize({width:1440,height:950});const requests=[];page.on('response',r=>{if(r.url().includes('pathly-source-han-serif'))requests.push(r.status());});await page.goto('/');const results=[];
 for(let i=0;i<4;i++){
  const t=page.locator('.poetic-theme').nth(i);await t.evaluate(el=>{el.dataset.charStarts='0';el.addEventListener('animationstart',e=>{if(e.target.classList.contains('poem-character'))el.dataset.charStarts=String(+el.dataset.charStarts+1);});el.scrollIntoView({block:'start',behavior:'instant'});});
  await expect(t).toHaveClass(/entered/);let box=await t.boundingBox();await page.mouse.move(box.x+box.width*.1,box.y+box.height*.1);
  await page.waitForTimeout(1120);const alphas=await t.locator('.poem-character').evaluateAll(nodes=>nodes.map(n=>Number(getComputedStyle(n).opacity)));expect(alphas[0]).toBeGreaterThan(0);expect(alphas.at(-1)).toBeLessThan(.1);
  if(i===0)await t.screenshot({path:`${dir}/poem-stagger.png`,animations:'allow'});
  await expect(t).toHaveClass(/exploring/);await expect.poll(()=>t.locator('.photo-wall').evaluate(el=>parseFloat(el.style.getPropertyValue('--pan-x'))||0)).toBeLessThan(-80);
  await page.waitForTimeout(650);const left=await t.locator('.wall-position').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y};}));const text=await t.locator('blockquote').boundingBox();
  if(i===0)await t.screenshot({path:`${dir}/wall-left-top.png`});
  await page.mouse.move(box.x+box.width*.9,box.y+box.height*.9);await expect.poll(()=>t.locator('.photo-wall').evaluate(el=>parseFloat(el.style.getPropertyValue('--pan-x'))||0)).toBeGreaterThan(80);await page.waitForTimeout(650);
  const right=await t.locator('.wall-position').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y};}));const deltas=right.map((r,j)=>({dx:Math.round(r.x-left[j].x),dy:Math.round(r.y-left[j].y)}));expect(deltas.every(d=>d.dx>150&&d.dy>100)).toBe(true);expect(await t.locator('blockquote').boundingBox()).toEqual(text);
  await t.screenshot({path:`${dir}/theme-${i}.png`});if(i===0)await t.screenshot({path:`${dir}/wall-right-bottom.png`});results.push({theme:i,initialOpacities:alphas,deltas,earlyPointerRetained:true});
  const count=await t.getAttribute('data-char-starts');await page.locator('#hero-title').scrollIntoViewIfNeeded();await t.evaluate(el=>el.scrollIntoView({block:'start'}));expect(await t.getAttribute('data-char-starts')).toBe(count);
 }
 await page.evaluate(()=>document.fonts.ready);expect(requests).toContain(200);
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'.poem-character'});const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});expect(fonts.some(f=>f.isCustomFont)).toBe(true);
 fs.writeFileSync(`${dir}/measurements.json`,JSON.stringify({fontResponses:requests,renderedFonts:fonts,walls:results},null,2));
});
