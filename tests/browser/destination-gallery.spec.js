import {test,expect} from '@playwright/test';
test('four equal portrait cards per row, font, hover and eight city actions',async({page})=>{
 await page.setViewportSize({width:1440,height:950});await page.goto('/');const cards=page.locator('.magazine-story');await expect(cards).toHaveCount(8);
 for(let i=0;i<8;i++){await cards.nth(i).scrollIntoViewIfNeeded();await expect(cards.nth(i)).toHaveClass(/in-view/);await cards.nth(i).locator('img').evaluate(i=>i.decode());}
 await page.waitForTimeout(1000);
 const boxes=await cards.evaluateAll(a=>a.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,radius:getComputedStyle(e).borderRadius,delay:e.style.getPropertyValue('--arrival-delay')};}));
 for(const b of boxes){expect(b.w/b.h).toBeCloseTo(.75,2);expect(b.radius).toBe('0px');expect(b.w).toBeCloseTo(boxes[0].w,1);}
 expect(boxes[3].y).toBe(boxes[0].y);expect(boxes[4].y).toBeGreaterThan(boxes[0].y);expect(boxes[1].x-boxes[0].x-boxes[0].w).toBeCloseTo(7,1);expect(boxes[3].delay).toBe('300ms');
 await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.fonts.check('400 40px PathlyDestinationSerif','北京'))).toBe(true);
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'.gallery-city'});const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});expect(fonts.some(f=>f.isCustomFont&&f.glyphCount>0)).toBe(true);
 await page.mouse.move(0,0);await page.locator('.dest-section').screenshot({path:'reports/destination-cards/desktop.png'});
 await cards.first().hover();await expect(cards.first().locator('.gallery-reveal')).toHaveCSS('opacity','1');await page.waitForTimeout(500);expect(await cards.first().locator('img').evaluate(i=>getComputedStyle(i).transform)).toContain('1.04');await page.locator('.magazine-gallery').screenshot({path:'reports/destination-cards/hover.png'});
 for(const [i,city] of ['北京','东京','巴黎','罗马','京都','伦敦','上海','巴厘岛'].entries()){await cards.nth(i).click();await expect(page.locator('#trip-planner .destination input')).toHaveValue(city);}
 await cards.first().focus();await page.keyboard.press('Enter');await expect(page.locator('#trip-planner .destination input')).toHaveValue('北京');
 await page.getByRole('button',{name:'EN',exact:true}).click();await cards.nth(6).click();await expect(page.locator('#trip-planner .destination input')).toHaveValue('Shanghai, CN');await cards.nth(7).click();await expect(page.locator('#trip-planner .destination input')).toHaveValue('Bali, Indonesia');
});
for(const width of [800,390,320])test(`responsive ${width}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:width<500,reducedMotion:'reduce'});const page=await context.newPage();await page.goto('http://127.0.0.1:5173/');const cards=page.locator('.magazine-story');await cards.last().scrollIntoViewIfNeeded();await page.locator('.dest-section img').evaluateAll(a=>Promise.all(a.map(i=>i.decode())));await cards.first().scrollIntoViewIfNeeded();await page.locator('.dest-section').screenshot({path:`reports/destination-cards/mobile-${width}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const a=await cards.nth(0).boundingBox(),b=await cards.nth(1).boundingBox();expect(width<359?b.y>a.y:b.y===a.y).toBe(true);await expect(cards.first().locator('.gallery-reveal')).toHaveCSS('opacity','1');await context.close();
});
