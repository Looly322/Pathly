import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1050,height:420}});
const compiled=await(await page.request.get('http://localhost:5173/src/components/WeatherPanel.vue')).text();
const vue=compiled.match(/from "([^"]*vue.js[^"]*)"/)[1],i18n=compiled.match(/from "([^"]*i18n\/index.js[^"]*)"/)[1];
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/weather-live',r=>r.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><link rel="stylesheet" href="/src/style.css"><div id="app"></div><script type="module">import {createApp,h,ref} from '${vue}';import Weather from '/src/components/WeatherPanel.vue';import {setLanguage} from '${i18n}';const city=ref(null);window.show=c=>city.value=c;window.lang=setLanguage;createApp({render:()=>h('main',{style:'padding:24px'},city.value?[h('h1',city.value.name),h(Weather,{destination:city.value,dates:['2026-10-15','2026-10-16','2026-10-17','2099-01-01']})]:[])}).mount('#app');</script>`}));
try{
 await page.goto('http://localhost:5173/weather-live');const rows=[];
 for(const [name,latitude,longitude,timezone] of [['北京',39.9042,116.4074,'Asia/Shanghai'],['巴黎',48.8566,2.3522,'Europe/Paris'],['东京',35.6762,139.6503,'Asia/Tokyo'],['开罗',30.0444,31.2357,'Africa/Cairo']]){
  await page.evaluate(c=>{window.lang('zh');window.show(c)},{name,latitude,longitude});
  await page.waitForFunction(tz=>document.querySelector('.weather-header')?.textContent.includes(tz),timezone,{timeout:13000});
  const text=await page.locator('.weather-panel').innerText();if(!text.includes('暂无可靠天气预报'))throw Error('range fallback absent');
  await page.screenshot({path:`reports/weather/${name}-zh.png`});await page.evaluate(()=>window.lang('en'));await page.getByText('Destination weather',{exact:true}).waitFor();await page.screenshot({path:`reports/weather/${name}-en.png`});rows.push({name,timezone,zh:text,en:await page.locator('.weather-panel').innerText()});
 }
 if(errors.length)throw Error(errors.join('\n'));await writeFile('reports/weather/ui-results.json',JSON.stringify(rows,null,2));console.log('4 real cities × Chinese/English: passed; range fallback passed; no console errors.');
}finally{await browser.close()}
