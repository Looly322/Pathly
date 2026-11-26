import {test,expect} from '@playwright/test';
test('real Beijing plan: editing, locking, modes, stale search and mobile layout',async({page})=>{
 test.setTimeout(180000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const form=page.locator('#trip-planner');await form.locator('.destination input').fill('东京');await form.locator('.generate').click();await form.locator('.destination input').fill('北京');await expect(form.locator('.destination input')).toHaveValue('北京');
 await form.evaluate(el=>{let v=el.__vueParentComponent;while(v&&!v.setupState.form)v=v.parent;v.setupState.form.transport='driving';v.setupState.form.date='2026-11-13';});
 await form.locator('.generate').click();const choice=page.locator('.city-option').first();await choice.waitFor({state:'visible',timeout:5000}).then(()=>choice.click()).catch(()=>{});await expect(page.locator('.trip-result')).toBeVisible({timeout:120000});
 await expect(page.locator('.journey-cover h1')).toContainText('北京');
 const first=page.locator('.journal-places .trip-event').first();const id=await first.getAttribute('id');const originalTime=await first.locator('.event-time').innerText();
 await first.getByRole('button',{name:'锁定',exact:true}).click();await expect(first.getByRole('button',{name:'删除',exact:true})).toBeDisabled();await first.getByRole('button',{name:'+15',exact:true}).click();await expect(page.locator('.journey-route .error').first()).toContainText('解锁');expect(await first.locator('.event-time').innerText()).toBe(originalTime);
 await page.locator('.trip-actions button').last().click();expect(await page.locator('#'+id+' .event-time').innerText()).toBe(originalTime);
 await page.locator('.trip-paces button').last().click();expect(await page.locator('#'+id+' .event-time').innerText()).toBe(originalTime);
 await page.locator('#'+id).getByRole('button',{name:'解锁',exact:true}).click();
 await page.locator('.trip-actions button').first().click();await expect(page.locator('.comparison-scroll')).toBeVisible();
 await page.locator('.journal-weather summary').click();await expect(page.locator('.weather-panel')).toBeVisible();
 await page.setViewportSize({width:390,height:844});await page.locator('.journal-places').evaluate(el=>el.scrollIntoView());expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'reports/core-repair/mobile.png'});
});
