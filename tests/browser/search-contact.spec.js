import {test,expect} from '@playwright/test';
test('editorial brief: native sticky, fields, fonts and mobile',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.evaluate(()=>{const el=document.querySelector('#trip-planner');scrollTo(0,el.getBoundingClientRect().top+scrollY)});
 const section=page.locator('#trip-planner'),intro=section.locator('.planning-intro');
 await expect(intro).toHaveCSS('position','sticky');await expect(section.locator('.planning-compass')).toHaveCount(0);
 await page.evaluate(()=>document.fonts.load('400 60px PathlySearchSerif','把向往，安排成旅程。'));
 expect(await page.evaluate(()=>document.fonts.check('400 60px PathlySearchSerif'))).toBe(true);
 await page.screenshot({path:'reports/search-contact/default.png'});
 const y=(await intro.boundingBox()).y;await page.evaluate(()=>scrollBy(0,460));
 expect(Math.abs((await intro.boundingBox()).y-64)).toBeLessThan(3);expect(y).toBeGreaterThan(64);
 await page.screenshot({path:'reports/search-contact/scrolled.png'});
 await section.locator('.popular button').first().click();await expect(section.locator('.destination input')).toHaveValue('北京');
 await section.locator('.wish-input input').fill('故宫');await section.locator('.wish-input button').click();await expect(section.locator('.wish-tags')).toContainText('故宫');
 await page.locator('.language button').last().click();await expect(intro).toContainText('Make room');
 await page.setViewportSize({width:390,height:844});await expect(intro).toHaveCSS('position','static');
 await section.scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await section.screenshot({path:'reports/search-contact/mobile.png'});
});
test('mask mechanism follows pointer independently and releases on exit (test-only image)',async({page})=>{
 // A plain test image verifies mechanics, NOT calligraphy or a deliverable artwork.
 await page.route('**/images/search/lantingxu.jpg',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/><path d="M0 0L100 100M100 0L0 100" stroke="black"/></svg>'}));
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 await page.evaluate(()=>scrollTo(0,document.querySelector('#trip-planner').getBoundingClientRect().top+scrollY));
 const art=page.locator('.search-calligraphy');await expect(art).toHaveClass(/art-ready/);
 await page.mouse.move(200,250);await expect.poll(()=>art.evaluate(e=>e.style.getPropertyValue('--ink-visible'))).toBe('1');
 const initial=await art.evaluate(e=>e.style.getPropertyValue('--ink-x'));
 await page.mouse.move(600,450);await expect.poll(()=>art.evaluate(e=>parseFloat(e.style.getPropertyValue('--ink-x')))).toBeGreaterThan(500);
 expect(await art.evaluate(e=>e.style.getPropertyValue('--ink-x'))).not.toBe(initial);
 await expect(art).toHaveCSS('pointer-events','none');await expect(art.locator('.calligraphy-reveal')).toHaveCSS('background-position','50% 0%');
 await page.mouse.move(0,0);await page.evaluate(()=>scrollTo(0,0));await page.mouse.move(10,10);
 await expect.poll(()=>art.evaluate(e=>e.style.getPropertyValue('--ink-visible'))).toBe('0');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(art.locator('.calligraphy-reveal')).toHaveCSS('display','none');
});
