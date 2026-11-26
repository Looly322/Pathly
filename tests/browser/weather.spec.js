import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
// 日期边界/失败测试使用真实响应存档作为夹具，实时四城另行验收。
const paris=JSON.parse(readFileSync('reports/weather/巴黎.json','utf8'));
async function mount(page){
 await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'));
 const main=await(await page.request.get('/src/main.js')).text(),vue=main.match(/from "([^"]*vue.js[^"]*)"/)[1];
 const component=await(await page.request.get('/src/components/WeatherPanel.vue')).text(),i18n=component.match(/from "([^"]*i18n\/index.js[^"]*)"/)[1];
 await page.route('**/weather-test',r=>r.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><script type="module">import {createApp,h,ref} from '${vue}';import Weather from '/src/components/WeatherPanel.vue';import {setLanguage} from '${i18n}';const city=ref({latitude:48.8566,longitude:2.3522}),dates=ref(['2026-10-20','2026-10-21','2099-01-01']);window.lang=setLanguage;window.city=v=>city.value=v;window.dates=v=>dates.value=v;createApp({render:()=>h('main',[h('h1','Existing itinerary remains usable'),h(Weather,{destination:city.value,dates:dates.value})])}).mount('#app');</script>`}));
 await page.goto('/weather-test');
}
test('exact dates, local zone, bilingual conditions, range fallback and narrow viewport',async({page})=>{
 let calls=0;await page.route('**/api/weather?**',r=>{calls++;return r.fulfill({json:paris})});await mount(page);
 await expect(page.locator('.weather-current')).toContainText('当前');await expect(page.locator('.weather-header')).toContainText('Europe/Paris');
 const index=paris.daily.time.indexOf('2026-10-20');await expect(page.locator('.weather-day').first()).toContainText('最高 '+Math.round(paris.daily.temperature_2m_max[index])+'°');
 await expect(page.locator('.weather-day').last()).toContainText('暂无可靠天气预报');
 await page.evaluate(()=>window.lang('en'));await expect(page.locator('.weather-current')).toContainText('Current');await expect(page.locator('.weather-day').last()).toContainText('No reliable forecast');
 await page.evaluate(()=>window.dates(['2099-01-01']));await expect(page.locator('.weather-day')).toHaveCount(1);expect(calls).toBe(1);
 await page.setViewportSize({width:375,height:700});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('failed service and timeout terminate loading without blocking itinerary',async({page})=>{
 let attempts=0,release;const gate=new Promise(r=>release=r);
 await page.route('**/api/weather?**',async r=>{attempts++;if(attempts===1)return r.fulfill({status:502,json:{error:'WEATHER_UNAVAILABLE'}});await gate;try{await r.abort()}catch{}});
 await mount(page);await expect(page.getByText('天气暂不可用',{exact:false})).toBeVisible();await expect(page.locator('h1')).toBeVisible();
 await page.getByRole('button',{name:'重试',exact:true}).click();await expect(page.getByText('正在查询天气…')).toBeVisible();await expect(page.getByText('天气暂不可用',{exact:false})).toBeVisible({timeout:13000});release();
});
test('late old-city response cannot overwrite new destination',async({page})=>{
 let release;const gate=new Promise(r=>release=r);
 const tokyo=JSON.parse(readFileSync('reports/weather/东京.json','utf8'));
 await page.route('**/api/weather?**',async r=>{if(new URL(r.request().url()).searchParams.get('latitude')==='48.8566'){await gate;return r.fulfill({json:paris})}return r.fulfill({json:tokyo})});
 await mount(page);await expect(page.getByText('正在查询天气…')).toBeVisible();await page.evaluate(()=>window.city({latitude:35.6762,longitude:139.6503}));await expect(page.locator('.weather-header')).toContainText('Asia/Tokyo');release();await page.waitForTimeout(200);await expect(page.locator('.weather-header')).not.toContainText('Europe/Paris');
});
