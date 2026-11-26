import {test,expect} from '@playwright/test'
async function generate(page,city='杭州') {
  await page.getByPlaceholder('搜索城市，例如：杭州 / 北京 / 成都').fill(city)
  await page.getByPlaceholder('输入地点名称，例如：小河直街').fill('小河直街')
  await page.getByRole('button',{name:'+ 加入',exact:true}).click()
  await page.getByRole('button',{name:'生成我的行程',exact:false}).click()
  await expect(page.locator('.result-heading h1')).toContainText(city)
}
test('complete itinerary workflow, persisted appearance, language and arbitrary cities',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/')
  await page.screenshot({path:'test-results/home-desktop.png',fullPage:true})
  await generate(page)
  await expect(page.locator('.timeline-item')).not.toHaveCount(0)
  const first=page.locator('.timeline-item').first()
  const before=await page.locator('.timeline-item').nth(1).locator('.time-row strong').innerText()
  await first.getByRole('button',{name:'停留 +15',exact:true}).click()
  await first.getByRole('button',{name:'停留 +15',exact:true}).click()
  expect(await page.locator('.timeline-item').nth(1).locator('.time-row strong').innerText()).not.toBe(before)
  await first.getByRole('button',{name:'锁定',exact:true}).click()
  const locked=await first.locator('.place-summary>strong').innerText()
  await page.getByRole('tab',{name:/松弛型/}).click()
  await expect(page.locator('.place-summary>strong').filter({hasText:locked})).toHaveCount(1)
  await page.getByRole('button',{name:'重新规划',exact:false}).click()
  await expect(page.locator('.place-summary>strong').filter({hasText:locked})).toHaveCount(1)
  const second=page.locator('.timeline-item').nth(1)
  const old=await second.locator('.place-summary>strong').innerText()
  await second.getByRole('button',{name:/换一个/}).click()
  expect(await page.locator('.timeline-item').nth(1).locator('.place-summary>strong').innerText()).not.toBe(old)
  await page.locator('.pathly-map-marker').first().click()
  await expect(page.locator('.timeline-item').first()).toHaveClass(/highlighted/)
  await page.locator('.place-main').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button',{name:/比较方案/}).click()
  await expect(page.locator('tbody tr')).toHaveCount(6)
  await page.keyboard.press('Escape')
  await page.getByRole('button',{name:'EN',exact:true}).click()
  await expect(page.getByRole('tab',{name:/Slow & Easy/})).toBeVisible()
  await page.getByRole('button',{name:/Theme/}).click()
  await page.getByRole('button',{name:'Ocean',exact:false}).click()
  await page.getByLabel('Custom theme color').fill('#ab2255')
  await page.getByRole('button',{name:'Close',exact:true}).click()
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--primary'))).toBe('#ab2255')
  await page.screenshot({path:'test-results/result-desktop.png',fullPage:true})
  await page.getByRole('button',{name:/Edit preferences/}).click()
  await expect(page.getByPlaceholder('Search a destination, e.g. Hangzhou, Beijing, Chengdu')).toHaveValue('杭州')
  await page.reload()
  await expect(page.getByRole('heading',{name:'Where do you want to go?'})).toBeVisible()
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--primary'))).toBe('#ab2255')
  await page.getByRole('button',{name:'中文',exact:true}).click()
  await generate(page,'长沙')
  await expect(page.getByText('以下为不对应真实地点的功能演示数据，不代表该城市景点。')).toBeVisible()
  await expect(page.locator('.timeline-item').first()).toContainText('演示')
  expect(errors).toEqual([])
})
test('overflow, undo, compression, ordering and responsive image fallback',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/images.unsplash.com/**',route=>route.abort())
  await page.setViewportSize({width:390,height:844})
  await page.goto('/')
  await page.screenshot({path:'test-results/home-mobile.png',fullPage:true})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await generate(page)
  await expect(page.locator('.image-fallback').first()).toBeVisible()
  const original=await page.locator('.place-summary>strong').first().innerText()
  await page.locator('.timeline-item').first().getByRole('button',{name:'↓ 下移'}).click()
  expect(await page.locator('.place-summary>strong').first().innerText()).not.toBe(original)
  await page.locator('.itinerary-heading').getByRole('button',{name:/撤销/}).click()
  expect(await page.locator('.place-summary>strong').first().innerText()).toBe(original)
  for(let i=0;i<35;i++)await page.locator('.timeline-item').first().getByRole('button',{name:'停留 +15',exact:true}).click()
  await expect(page.getByRole('alert').filter({hasText:'超出结束时间'})).toBeVisible()
  await page.getByRole('button',{name:'自动压缩',exact:true}).click()
  await expect(page.getByRole('alert').filter({hasText:'超出结束时间'})).toHaveCount(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:'test-results/result-mobile.png',fullPage:true})
  await page.getByRole('button',{name:/比较方案/}).click()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.keyboard.press('Escape')
  for(const width of [320,768,1024]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
  expect(errors).toEqual([])
})
test('generated result uses real map, excludes demo coordinates and keeps timeline numbering',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await generate(page,'北京');
 await expect(page.locator('.result-map-status')).toContainText('已匹配');
 await expect(page.locator('svg.mock-map')).toHaveCount(0);
 await expect(page.locator('.result-map-status')).toContainText('演示地点，不在真实地图上标记');
 const rows=await page.locator('.timeline-item .place-summary>strong').allTextContents();
 const markerNames=await page.locator('.pathly-map-marker').evaluateAll(els=>els.map(el=>el.getAttribute('aria-label')));
 expect(markerNames.length).toBeGreaterThan(0);
 for(const [i,name] of rows.entries()){
   if(name.includes('演示'))expect(markerNames.some(label=>label===`${i+1}. ${name}`)).toBe(false);
   else expect(markerNames).toContain(`${i+1}. ${name}`);
 }
 const count=await page.evaluate(()=>window.__amapFixture.queries.length);
 await page.locator('.timeline-item').first().getByRole('button',{name:'停留 +15',exact:true}).click();
 await page.waitForTimeout(250);
 expect(await page.evaluate(()=>window.__amapFixture.queries.length)).toBe(count);
 await page.getByRole('tab',{name:/松弛型/}).click();
 await expect(page.locator('.result-map-status')).toContainText('已匹配');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('ambiguous result POI requires explicit candidate selection',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:'下一站，想去哪？'})).toBeVisible();
 await page.evaluate(()=>{window.__amapFixture.ambiguous=true;});
 await generate(page,'北京');
 await expect(page.locator('.match-candidates').first()).toBeVisible();
 await page.locator('.match-candidates').first().locator('summary').click();
 await page.locator('.match-candidates').first().getByRole('button',{name:/南锣鼓巷景区/}).click();
 await expect(page.locator('.marker-place-name').filter({hasText:'南锣鼓巷景区'})).toHaveCount(1);
 await expect(page.locator('.match-candidates')).toHaveCount(0);
});
test('style tabs show actual attraction differences and switching updates the itinerary',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});await generate(page,'北京');
 await expect(page.locator('.tab-metrics')).toHaveCount(3);
 const metrics=await page.locator('.tab-metrics b').allTextContents();
 const explorerAttractions=Number(metrics[0].match(/\d+/)[0]);
 const slowAttractions=Number(metrics[1].match(/\d+/)[0]);
 expect(explorerAttractions).toBeGreaterThan(slowAttractions);
 const explorerCount=await page.locator('.timeline-item').count();
 await page.getByRole('tab',{name:/松弛型/}).click();
 expect(await page.locator('.timeline-item').count()).toBeLessThan(explorerCount);
 await expect(page.locator('.style-explanation')).toContainText('减少景点');
 await page.getByRole('tab',{name:/避峰型/}).click();
 await expect(page.locator('.style-explanation')).toContainText('预计拥挤度');
 await page.getByRole('button',{name:/比较方案/}).click();
 await expect(page.getByRole('dialog')).toContainText('景点数量');
 await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/styles-mobile.png',fullPage:true});
 await page.setViewportSize({width:1280,height:900});
 await page.screenshot({path:'test-results/styles-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.locator('.tab-metrics').first()).toContainText('attractions');
 await expect(page.locator('.style-explanation')).toContainText('Crowd Smart');
});
