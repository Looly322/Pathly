import {test,expect} from '@playwright/test';
test('hero search, destination cards and interests share the original form',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#hero-title')).toContainText('世界很大');
 await page.locator('.hero-search input').fill('巴黎');await page.getByRole('button',{name:'开始规划',exact:true}).click();await expect(page.locator('#trip-planner .destination input')).toHaveValue('巴黎');
 await page.locator('.interest-story').first().click();await expect(page.locator('.selection-notice')).toContainText('自然');await expect(page.locator('.interest-story').first()).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.destination-story')).toHaveCount(6);await page.locator('.destination-story').nth(1).click();await expect(page.locator('#trip-planner .destination input')).toHaveValue('东京');
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.locator('#hero-title')).toContainText('Where to next?');await page.locator('.destination-story').nth(2).click();await expect(page.locator('#trip-planner .destination input')).toHaveValue('Paris, FR');
 expect(errors).toEqual([]);
});
test('reduced motion, mobile width and photo failure keep controls usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
 await page.route('**/images/home/*.webp',r=>r.abort());await page.goto('/');
 await expect(page.locator('.hero-image .editorial-fallback')).toBeVisible();await expect(page.locator('.motion-toggle')).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await page.locator('.hero-image').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 await page.locator('.hero-search input').fill('北京');await page.getByRole('button',{name:'开始规划',exact:true}).click();await expect(page.locator('#trip-planner .destination input')).toHaveValue('北京');
});
test('original submit still resolves the entered destination; API error remains visible',async({page})=>{
 await page.route('**/webapi.amap.com/**',r=>r.abort());let query;
 await page.route('**/api/destinations/search?**',r=>{query=new URL(r.request().url()).searchParams.get('q');return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'API_UNAVAILABLE'})});});
 await page.goto('/');await page.locator('.hero-search input').fill('Paris');await page.getByRole('button',{name:'开始规划',exact:true}).click();await page.locator('button.generate').click();await expect(page.getByRole('alert')).toContainText('无法连接搜索服务',{timeout:30000});expect(query).toBe('Paris');
});
