import {test,expect} from '@playwright/test';
test('search palette, interactions and bilingual responsive layout',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const form=page.locator('#trip-planner');await form.scrollIntoViewIfNeeded();
 await expect(form.locator('.primary.generate')).toHaveCSS('background-color','rgb(32, 61, 53)');
 await form.locator('.popular button').first().click();await expect(form.locator('.destination input')).toHaveValue('北京');
 const tag=form.locator('.chips button').nth(2);const before=await tag.getAttribute('aria-pressed');await tag.click();await expect(tag).toHaveAttribute('aria-pressed',before==='true'?'false':'true');
 await form.locator('.segmented button').last().click();await expect(form.locator('.segmented button').last()).toHaveAttribute('aria-pressed','true');
 await form.locator('.destination input').focus();await expect(form.locator('.destination input')).toHaveCSS('border-top-color','rgb(32, 61, 53)');
 await page.setViewportSize({width:1440,height:1100});await form.screenshot({path:'reports/search-editorial/desktop-zh.png'});
 await page.locator('.language button').last().click();await form.screenshot({path:'reports/search-editorial/desktop-en.png'});
 await page.setViewportSize({width:390,height:844});await form.screenshot({path:'reports/search-editorial/mobile-en.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.language button').first().click();await form.screenshot({path:'reports/search-editorial/mobile-zh.png'});
});
test('city chooser and cancellation keep search usable',async({page})=>{
 // Controlled city choices exercise the existing UI; no live provider claim.
 await page.route('**/api/destinations/search?**',r=>r.fulfill({json:{destinations:[{id:'paris-fr',displayName:'巴黎',canonicalName:'Paris',city:'Paris',country:'France',countryCode:'FR',region:'Île-de-France',latitude:48.8566,longitude:2.3522},{id:'paris-us',displayName:'Paris',canonicalName:'Paris',city:'Paris',country:'United States',countryCode:'US',region:'Texas',latitude:33.6609,longitude:-95.5555}]}}));
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const form=page.locator('#trip-planner');await form.locator('.destination input').fill('Paris');await form.locator('.generate').click();
 const dialog=page.locator('.destination-overlay');await expect(dialog).toBeVisible({timeout:20000});await expect(dialog.locator('.city-option')).toHaveCount(2);
 await expect(dialog.locator('.city-option').first()).toHaveCSS('background-color','rgb(237, 231, 220)');await dialog.screenshot({path:'reports/search-editorial/city-dialog.png'});
 await dialog.locator('.text-button').click();await expect(dialog).toHaveCount(0);await expect(form.locator('.generate')).toBeEnabled();
});
