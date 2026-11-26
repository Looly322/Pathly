import {test,expect} from '@playwright/test';
test('real Lanting scan reveals fixed ink, fades and keeps form interactive',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 await page.evaluate(()=>scrollTo(0,document.querySelector('#trip-planner').getBoundingClientRect().top+scrollY));
 const layer=page.locator('.search-calligraphy'),ink=layer.locator('.calligraphy-reveal');
 await expect(layer).toHaveClass(/art-ready/);
 await page.mouse.move(-10,-10);await expect.poll(()=>ink.evaluate(e=>Number(getComputedStyle(e).opacity))).toBe(0);await page.screenshot({path:'reports/search-calligraphy/default.png'});
 const position=await ink.evaluate(e=>getComputedStyle(e).backgroundPosition);
 await page.mouse.move(310,650);await expect.poll(()=>ink.evaluate(e=>Number(getComputedStyle(e).opacity))).toBeGreaterThan(.34);
 await expect.poll(()=>layer.evaluate(e=>parseFloat(e.style.getPropertyValue('--ink-y')))).toBeGreaterThan(640);await page.screenshot({path:'reports/search-calligraphy/revealed.png'});
 await page.mouse.move(480,760);await expect.poll(()=>layer.evaluate(e=>parseFloat(e.style.getPropertyValue('--ink-x')))).toBeGreaterThan(460);
 expect(await ink.evaluate(e=>getComputedStyle(e).backgroundPosition)).toBe(position);
 await page.locator('#trip-planner .destination input').fill('东京');await expect(page.locator('#trip-planner .destination input')).toHaveValue('东京');
 await page.locator('#trip-planner input[type=date]').fill('2026-11-10');await expect(page.locator('#trip-planner input[type=date]')).toHaveValue('2026-11-10');
 const tag=page.locator('#trip-planner .chips button').nth(2);const before=await tag.getAttribute('aria-pressed');await tag.click();await expect(tag).toHaveAttribute('aria-pressed',before==='true'?'false':'true');
 await page.evaluate(()=>scrollTo(0,0));await page.mouse.move(10,10);await expect.poll(()=>ink.evaluate(e=>Number(getComputedStyle(e).opacity))).toBe(0);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(ink).toHaveCSS('display','none');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
