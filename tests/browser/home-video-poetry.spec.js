import {test,expect} from '@playwright/test';
test('real local film plays, pauses, and falls back on failure',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 const video=page.locator('.travel-video video');await expect(video).toBeVisible();
 await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeGreaterThan(.2);
 const data=await video.evaluate(v=>({duration:v.duration,muted:v.muted,loop:v.loop,inline:v.playsInline,width:v.videoWidth}));
 expect(data.duration).toBeGreaterThanOrEqual(10);expect(data.duration).toBeLessThanOrEqual(15);expect(data).toMatchObject({muted:true,loop:true,inline:true,width:1600});
 await page.locator('.motion-toggle').click();await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);
 await page.locator('.motion-toggle').click();await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(false);
 await video.evaluate(v=>v.dispatchEvent(new Event('error')));await expect(video).toHaveCount(0);await expect(page.locator('.hero-image img')).toBeVisible();
});
test('mobile and reduced motion never request video',async({page})=>{
 const requests=[];page.on('request',r=>{if(r.url().includes('.mp4'))requests.push(r.url());});
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('.hero-image img')).toBeVisible();await expect(page.locator('video')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.reload();await expect(page.locator('video')).toHaveCount(0);expect(requests).toEqual([]);
 await page.locator('.poem-intro').first().scrollIntoViewIfNeeded();await expect(page.locator('.poem-intro').first()).toHaveCSS('opacity','1');
});
test('poems precede pictures, scroll fade and pointer parallax work',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');await expect(page.locator('.poem-intro')).toHaveCount(4);
 await expect(page.locator('.poem-author').first()).toHaveText('杜甫《望岳》');
 const chapter=page.locator('.poetic-theme').first();const poem=chapter.locator('.poem-intro');
 await poem.evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-200));
 await expect.poll(()=>poem.evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(.8);
 await poem.evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().bottom+scrollY-80));
 await expect.poll(()=>poem.evaluate(el=>Number(getComputedStyle(el).opacity))).toBeLessThan(.4);
 const picture=chapter.locator('.story-picture');await picture.scrollIntoViewIfNeeded();const box=await picture.boundingBox();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.5);
 await expect.poll(()=>picture.evaluate(el=>parseFloat(el.style.getPropertyValue('--mouse-x'))||0)).toBeGreaterThan(1);
 await chapter.locator('button').click();await expect(page.locator('.selection-notice')).toContainText('自然');
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.locator('.poem-author').first()).toContainText('Du Fu');
});
test('video network error leaves usable poster and search',async({page})=>{
 await page.route('**/*.mp4',r=>r.abort());await page.goto('/');await expect(page.locator('video')).toHaveCount(0);await expect(page.locator('.hero-image img')).toBeVisible();
 await page.locator('.hero-search input').fill('巴黎');await page.locator('.hero-start').click();await expect(page.locator('#trip-planner .destination input')).toHaveValue('巴黎');
});
