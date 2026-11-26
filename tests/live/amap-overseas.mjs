// 仅评估现有 Key 的地图显示，不修改产品入口，不记录密钥或请求 URL。
import {chromium} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1200,height:800}});
await mkdir('reports/amap-overseas',{recursive:true});
const errors=[];page.on('pageerror',()=>errors.push('browser-runtime-error'));
await page.route('**/amap-overseas-probe',r=>r.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><style>body{margin:0;font:16px system-ui}h2{margin:0;padding:16px}#map{height:720px}</style><h2 id="title">AMap overseas evaluation</h2><div id="map"></div><script type="module">
import {loadAmap} from '/src/services/amapService.js';
try{window.sdk=await loadAmap();window.ready=true}catch{window.failed=true}
window.showMap=async({name,center,lang,zoom})=>{window.map?.destroy();document.querySelector('#title').textContent=name+' · '+lang+' · zoom '+zoom;window.map=new window.sdk.Map('map',{center,zoom,lang,viewMode:'2D',resizeEnable:true});window.map.addControl(new window.sdk.ToolBar());new window.sdk.Marker({position:center,title:name}).setMap(window.map);return await new Promise(resolve=>{const timer=setTimeout(()=>resolve('timeout'),18000);window.map.on('complete',()=>{clearTimeout(timer);resolve('complete')})})};
</script>`}));
const result=[];
try{
 await page.goto('http://localhost:5173/amap-overseas-probe');
 await page.waitForFunction(()=>window.ready||window.failed,{},{timeout:30000});
 if(await page.evaluate(()=>window.failed))throw Error('SDK failed');
 for(const [name,center] of [['Paris',[2.3376,48.8606]],['Tokyo',[139.7454,35.6586]],['Cairo',[31.2336,30.0478]]]){
  for(const lang of ['zh_cn','en']){
   const complete=await page.evaluate(args=>window.showMap(args),{name,center,lang,zoom:12});
   await page.waitForTimeout(1500);
   const state=await page.evaluate(()=>({version:window.sdk.version,center:window.map.getCenter().toArray(),zoom:window.map.getZoom(),getLang:window.map.getLang?.(),setLang:typeof window.map.setLang,complete:Boolean(window.map)}));
   await page.screenshot({path:`reports/amap-overseas/${name}-${lang}-city.png`});
   await page.evaluate(()=>window.map.setZoom(16));await page.waitForTimeout(2500);
   await page.screenshot({path:`reports/amap-overseas/${name}-${lang}-street.png`});
   result.push({name,lang,complete,...state});console.log(JSON.stringify(result.at(-1)));
  }
 }
 await writeFile('reports/amap-overseas/results.json',JSON.stringify({result,errors},null,2));
}finally{await browser.close()}
