import {test,expect} from '@playwright/test';
test('missing deployed API shows actionable error and allows retry',async({page})=>{
 await page.route('**/webapi.amap.com/**',r=>r.abort());
 await page.route('**/api/destinations/search?**',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><div id="app"></div>'}));
 await page.goto('/');await page.locator('.destination input').first().fill('Paris');
 await page.locator('button.generate').click();await expect(page.getByRole('alert')).toContainText('搜索接口未部署',{timeout:30000});await expect(page.locator('button.generate')).toBeEnabled();
});
