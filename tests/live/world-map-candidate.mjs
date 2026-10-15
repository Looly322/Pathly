// 独立候选方案验证，不替换 GlobalMap 或国内高德组件。
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const style=process.env.MAP_STYLE||'liberty';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1200,height:800}});
await mkdir('reports/world-map-'+style,{recursive:true});
const compiled=await(await page.request.get('http://localhost:5173/src/components/GlobalMap.vue')).text();
const glUrl=compiled.match(/"([^" ]*\/maplibre-gl.js[^" ]*)"/)[1];
await page.route('**/world-map-candidate',r=>r.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><link rel="stylesheet" href="/node_modules/maplibre-gl/dist/maplibre-gl.css"><style>body{margin:0;font:16px system-ui}h2{margin:0;padding:16px}#map{height:690px}.pin{width:30px;height:30px;border-radius:50%;border:2px solid white;background:#3c096c;color:white;font-weight:bold;cursor:pointer}.note{padding:8px}</style><h2 id="title"></h2><div id="map"></div><div class="note">候选方案实测 · 路线示意（直线，非道路导航） · 缺少译名时保留当地名称</div><script type="module">
import {Map,NavigationControl,Marker,Popup,setWorkerUrl} from '${glUrl}';
import worker from '/node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {mapNameExpression} from '/src/utils/mapStyle.js';setWorkerUrl(worker);
window.gl=new Map({container:'map',style:'https://tiles.openfreemap.org/styles/${style}',center:[2.3376,48.8606],zoom:13});gl.addControl(new NavigationControl());window.pins=[];window.ready=false;gl.on('load',()=>window.ready=true);
window.paint=async({name,center,points,language})=>{
 document.querySelector('#title').textContent=name+' · '+language+' · MapLibre GL JS / OpenFreeMap ${style}';
 gl.jumpTo({center,zoom:13});
 for(const l of gl.getStyle().layers){if(l.type==='symbol'&&/name/.test(JSON.stringify(l.layout?.['text-field'])))gl.setLayoutProperty(l.id,'text-field',mapNameExpression(language))}
 pins.forEach(p=>p.remove());window.pins=points.map((p,i)=>{const b=document.createElement('button');b.className='pin';b.textContent=i+1;return new Marker({element:b}).setLngLat(p.coords).setPopup(new Popup().setText(language==='zh'?p.zh:p.en)).addTo(gl)});
 const data={type:'Feature',geometry:{type:'LineString',coordinates:points.map(p=>p.coords)}};
 if(gl.getSource('route'))gl.getSource('route').setData(data);else{gl.addSource('route',{type:'geojson',data});gl.addLayer({id:'route',type:'line',source:'route',paint:{'line-color':'#3c096c','line-width':3,'line-dasharray':[2,2]}})}
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('render timeout')),30000);gl.once('idle',()=>{clearTimeout(timer);resolve()});gl.triggerRepaint()});
 const features=gl.queryRenderedFeatures().filter(f=>f.properties?.name);const names=new globalThis.Map(features.map(f=>[f.properties.name,f.properties]));
 return {center:gl.getCenter().toArray(),zoom:gl.getZoom(),namedFeatures:names.size,translated:[...names.values()].filter(p=>language==='zh'?(p['name:zh']||p['name:zh-Hans']||p.name_zh):(p['name:en']||p.name_en)).length,fallbackExamples:[...names.values()].filter(p=>language==='zh'?!(p['name:zh']||p['name:zh-Hans']||p.name_zh):!(p['name:en']||p.name_en)).slice(0,6).map(p=>p.name)};
};</script>`}));
const cases=[{name:'Paris',center:[2.3376,48.8606],points:[{coords:[2.3376,48.8606],zh:'卢浮宫',en:'Louvre Museum'},{coords:[2.2945,48.8584],zh:'埃菲尔铁塔',en:'Eiffel Tower'}]},{name:'Tokyo',center:[139.7454,35.6586],points:[{coords:[139.7454,35.6586],zh:'东京塔',en:'Tokyo Tower'},{coords:[139.6993,35.6764],zh:'明治神宫',en:'Meiji Shrine'}]},{name:'Cairo',center:[31.2336,30.0478],points:[{coords:[31.2336,30.0478],zh:'埃及博物馆',en:'Egyptian Museum'},{coords:[31.2599,30.0286],zh:'开罗城堡',en:'Cairo Citadel'}]}];
const results=[];
try{
 await page.goto('http://localhost:5173/world-map-candidate');await page.waitForFunction(()=>window.ready,{},{timeout:40000});
 for(const city of cases)for(const language of ['zh','en']){
  const result=await page.evaluate(args=>window.paint(args),{...city,language});results.push({city:city.name,language,...result});
  await page.screenshot({path:`reports/world-map-${style}/${city.name}-${language}.png`});
  await page.evaluate(()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Street render timeout')),30000);gl.once('idle',()=>{clearTimeout(timer);resolve()});gl.setZoom(16)}));
  await page.locator('.pin').first().click();
  await page.screenshot({path:`reports/world-map-${style}/${city.name}-${language}-street.png`});
  console.log(JSON.stringify(results.at(-1)));
 }
 await writeFile('reports/world-map-'+style+'/results.json',JSON.stringify(results,null,2));
}finally{await browser.close()}
