import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test('eight-second local video loops natively and content enters in the specified order',async({page})=>{
 await page.setViewportSize({width:1440,height:950});await page.addInitScript(()=>{window.heroStarts=[];document.addEventListener('animationstart',e=>{if(['home-nav-enter','hero-content-enter'].some(n=>e.animationName.startsWith(n)))window.heroStarts.push({className:e.target.className,time:performance.now()});});});
 await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.locator('.brand-intro')).toHaveCount(0);
 const v=page.locator('.travel-video video');await expect(v).toHaveAttribute('src','/videos/pathly-hero.mp4');await expect.poll(()=>v.evaluate(v=>v.currentTime)).toBeGreaterThan(.1);
 await page.waitForTimeout(3600);const starts=await page.evaluate(()=>window.heroStarts);expect(starts).toHaveLength(6);
 const selectors=['.home-header','.hero-eyebrow','.hero-line-first','.hero-line-second','.hero-subtitle','.hero-search'];const delays=['0.8s','1.2s','1.6s','1.9s','2.3s','2.7s'];
 for(let i=0;i<selectors.length;i++){await expect(page.locator(selectors[i])).toHaveCSS('animation-delay',delays[i]);await expect(page.locator(selectors[i])).toHaveCSS('opacity','1');}
 const relative=starts.map(s=>Math.round(s.time-starts[0].time));for(let i=0;i<6;i++)expect(Math.abs(relative[i]-[0,400,800,1100,1500,1900][i])).toBeLessThan(120);
 await page.screenshot({path:'reports/hero-eight-seconds/desktop.png'});
 const loop=await v.evaluate(v=>new Promise(resolve=>{let last=v.currentTime,wraps=0,minReady=4,stalls=0;const tick=setInterval(()=>{if(v.currentTime<last-.5)wraps++;last=v.currentTime;minReady=Math.min(minReady,v.readyState);},80);const waiting=()=>stalls++;v.addEventListener('waiting',waiting);setTimeout(()=>{clearInterval(tick);v.removeEventListener('waiting',waiting);resolve({wraps,minReady,stalls,duration:v.duration,muted:v.muted,loop:v.loop,playsInline:v.playsInline,paused:v.paused});},8500);}));expect(loop.wraps).toBeGreaterThanOrEqual(1);expect(loop.duration).toBe(8);expect(loop.paused).toBe(false);expect(loop.minReady).toBeGreaterThanOrEqual(2);
 await page.locator('.hero-search input').fill('巴黎');await page.locator('.hero-start').click();await expect(page.locator('#trip-planner .destination input')).toHaveValue('巴黎');
 fs.writeFileSync('reports/hero-eight-seconds/measurements.json',JSON.stringify({starts,relative,loop},null,2));
 await page.reload();await expect(page.locator('.brand-intro')).toHaveCount(0);await expect(page.locator('.hero-search')).toHaveCSS('opacity','1',{timeout:5000});
});
test('mobile playback and reduced-motion poster stay usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(.1);await page.waitForTimeout(3400);await page.screenshot({path:'reports/hero-eight-seconds/mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('video')).toHaveCount(0);await expect(page.locator('.hero-image img')).toHaveAttribute('src','/videos/pathly-hero-poster.webp');await expect(page.locator('.hero-search')).toHaveCSS('animation-name','none');await expect(page.locator('.home-header')).toHaveCSS('opacity','1');
});
