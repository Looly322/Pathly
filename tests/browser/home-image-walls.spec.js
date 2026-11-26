import {test,expect} from '@playwright/test';
const poems=['行到水穷处，坐看云起时。','人事有代谢，往来成古今。','东风夜放花千树，更吹落、星如雨。','日啖荔枝三百颗，不辞长作岭南人。'];
test('four exact poems overlay six distinct real images per theme',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 for(let i=0;i<4;i++){
  const theme=page.locator('.poetic-theme').nth(i);await theme.scrollIntoViewIfNeeded();await expect(theme).toHaveClass(/exploring/);
  await expect(theme.locator('blockquote')).toHaveAttribute('aria-label',poems[i]);await expect(theme.locator('.wall-photo img')).toHaveCount(6);
  expect(await theme.locator('img').evaluateAll(imgs=>new Set(imgs.map(i=>i.src)).size)).toBe(6);
  await expect.poll(()=>theme.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
  const rects=await theme.evaluate(el=>({wall:el.querySelector('.photo-wall').getBoundingClientRect().width,viewport:el.getBoundingClientRect().width}));expect(rects.wall).toBeGreaterThan(rects.viewport);
 }
 await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.fonts.check('64px PathlyPoetry','行到水穷处'))).toBe(true);
});
test('60ms character stagger follows photos, runs once; pointer changes depths but not text',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');const theme=page.locator('.poetic-theme').first();
 await theme.evaluate(el=>{el.dataset.starts='0';el.addEventListener('animationstart',e=>{if(e.target.classList.contains('poem-character'))el.dataset.starts=String(Number(el.dataset.starts)+1);});});
 await theme.scrollIntoViewIfNeeded();await expect(theme).toHaveClass(/exploring/);
 const chars=theme.locator('.poem-character');const delays=await chars.evaluateAll(nodes=>nodes.map(n=>parseFloat(getComputedStyle(n).animationDelay)));
 expect(delays[0]).toBe(1.25);expect(delays[1]-delays[0]).toBeCloseTo(.06);
 const authorDelay=await theme.locator('.poem-author').evaluate(el=>parseFloat(getComputedStyle(el).animationDelay));expect(authorDelay).toBeGreaterThan(delays.at(-1)+.74);
 const textBefore=await theme.locator('blockquote').boundingBox(),box=await theme.boundingBox();await page.mouse.move(box.x+box.width*.85,box.y+box.height*.3);
 await expect.poll(()=>theme.locator('.photo-wall').evaluate(el=>parseFloat(el.style.getPropertyValue('--pan-x'))||0)).toBeGreaterThan(5);
 const transforms=await theme.locator('.wall-position').evaluateAll(nodes=>nodes.map(el=>getComputedStyle(el).transform));expect(new Set(transforms).size).toBeGreaterThan(3);expect(await theme.locator('blockquote').boundingBox()).toEqual(textBefore);
 const starts=await theme.getAttribute('data-starts');await page.locator('#hero-title').scrollIntoViewIfNeeded();await theme.scrollIntoViewIfNeeded();expect(await theme.getAttribute('data-starts')).toBe(starts);expect(Number(starts)).toBe(poems[0].length);
 await theme.locator('.interest-story').click();await expect(page.locator('.selection-notice')).toContainText('自然');
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect(theme.locator('.poem-author')).toContainText('Wang Wei');
});
test('mobile layout and reduced-motion fallback retain theme selection',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');const theme=page.locator('.poetic-theme').nth(2);await theme.scrollIntoViewIfNeeded();
 await expect(theme).toHaveClass(/exploring/);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const char=theme.locator('.poem-character').first();await expect(char).toHaveCSS('opacity','1');await expect(char).toHaveCSS('animation-name','none');
 await theme.locator('.interest-story').click();await expect(page.locator('.selection-notice')).toContainText('城市');
});
