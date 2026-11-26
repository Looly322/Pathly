import {test,expect} from '@playwright/test';
// 真实免费底图加载验收；地点为真实坐标固定输入，不调用 POI 服务。
test('Paris, Tokyo, Cairo and Beijing maps: live basemap and state-preserving language changes',async({page})=>{
 test.setTimeout(180000);
 const component=await(await page.request.get('/src/components/GlobalMap.vue')).text();
 const moduleUrl=name=>component.match(new RegExp('"([^" ]*'+name+'\\.js[^" ]*)"'))[1];
 const vue=moduleUrl('vue'),maplibre=moduleUrl('maplibre-gl'),i18n=moduleUrl('i18n/index');
 const cities=[
 {id:'Paris',displayName:'巴黎',countryCode:'FR',latitude:48.8584,longitude:2.2945,places:[{id:'eiffel',name:'Tour Eiffel',nameEnglish:'Eiffel Tower',nameZh:'埃菲尔铁塔',latitude:48.8584,longitude:2.2945},{id:'louvre',name:'Musée du Louvre',nameEnglish:'Louvre Museum',nameZh:'卢浮宫',latitude:48.8606,longitude:2.3376}]},
 {id:'Tokyo',displayName:'东京',countryCode:'JP',latitude:35.6586,longitude:139.7454,places:[{id:'tower',name:'東京タワー',nameEnglish:'Tokyo Tower',nameZh:'东京塔',latitude:35.6586,longitude:139.7454},{id:'shrine',name:'明治神宮',nameEnglish:'Meiji Shrine',nameZh:'明治神宫',latitude:35.6764,longitude:139.6993}]},
 {id:'Cairo',displayName:'开罗',countryCode:'EG',latitude:30.0478,longitude:31.2336,places:[{id:'museum',name:'المتحف المصري',nameEnglish:'Egyptian Museum',nameZh:'埃及博物馆',latitude:30.0478,longitude:31.2336},{id:'citadel',name:'قلعة صلاح الدين',nameEnglish:'Cairo Citadel',nameZh:'开罗城堡',latitude:30.0286,longitude:31.2599}]},
 {id:'Beijing',displayName:'北京',countryCode:'CN',latitude:39.9163,longitude:116.3972,places:[{id:'palace',name:'故宫博物院',latitude:39.9163,longitude:116.3972},{id:'temple',name:'天坛',latitude:39.8822,longitude:116.4066}]}
 ];
 const errors=[];page.on('pageerror',e=>errors.push(e.message.replace(/https?:\/\/\S+/g,'[url]')));
 await page.route('**/map-acceptance',r=>r.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/map-planning.css"><link rel="stylesheet" href="/src/map-planning.css"><div id="app"></div><script type="module">
 import {createApp,h,ref} from '${vue}';import {Map as GLMap} from '${maplibre}';import {setLanguage} from '${i18n}';import Unified from '/src/components/UnifiedTripMap.vue';import '/src/utils/theme.js';import '/src/utils/theme.js';
 const addControl=GLMap.prototype.addControl;GLMap.prototype.addControl=function(...args){window.testMap=this;window.styleErrors=[];this.on('layeradd',e=>{e.layer.getMaplibreMap?.().on('error',e=>window.styleErrors.push(e.error.message))});window.styleErrors=[];this.on('error',e=>window.styleErrors.push(e.error.message));return addControl.apply(this,args)};
 const cities=${JSON.stringify(cities)},city=ref(cities[0]),active=ref('');window.setCity=i=>{active.value='';city.value=cities[i]};window.setLanguage=setLanguage;
 createApp({setup:()=>()=>h('div',{style:'max-width:900px;margin:20px auto'},[h(Unified,{key:city.value.id,destination:city.value,places:city.value.places,active:active.value,onSelect:id=>active.value=id}),h('p',{id:'chosen'},active.value),...city.value.places.map(p=>h('button',{class:'list-select',onClick:()=>active.value=p.id},p.name))])}).mount('#app');</script>`}));
 await page.goto('/map-acceptance');
 for(let i=0;i<3;i++){
  await page.evaluate(i=>{window.setLanguage('zh');window.setCity(i)},i);
  await expect(page.locator('.global-pin')).toHaveCount(2);
  await expect.poll(()=>page.evaluate(()=>{const gl=window.testMap;return gl?.isStyleLoaded()&&gl?.areTilesLoaded()}),{timeout:45000}).toBe(true);
  await expect(page.locator('.leaflet-tooltip')).toHaveCount(0);
  await page.locator('.global-pin').first().click();await expect(page.locator('#chosen')).toHaveText(cities[i].places[0].id);
  await expect(page.locator('.maplibregl-popup-content')).toContainText(cities[i].places[0].nameZh);
  await page.locator('.list-select').nth(1).click();await expect(page.locator('.global-pin.active')).toHaveText('2');
  await page.locator('.maplibregl-ctrl-zoom-in').click();
  await page.evaluate(()=>window.testMap.panBy([70,40],{duration:0}));
  const state=await page.evaluate(()=>({center:window.testMap.getCenter(),zoom:window.testMap.getZoom()}));
  await page.evaluate(()=>window.setLanguage('en'));
  await expect(page.locator('.maplibregl-popup-content')).toContainText(cities[i].places[1].nameEnglish);
  expect(await page.evaluate(()=>({center:window.testMap.getCenter(),zoom:window.testMap.getZoom()}))).toEqual(state);
  const fields=await page.evaluate(()=>{const gl=window.testMap;return gl.getStyle().layers.filter(l=>l.type==='symbol'&&JSON.stringify(l.layout?.['text-field']||'').includes('name')).map(l=>JSON.stringify(l.layout['text-field']))});
  expect(await page.evaluate(()=>window.styleErrors)).toEqual([]);expect(await page.evaluate(()=>window.styleErrors)).toEqual([]);expect(fields.length).toBeGreaterThan(5);expect(fields.filter(f=>!f.includes('name:en')||f.includes('concat'))).toEqual([]);
  await expect(page.locator('.world-map-route-note')).toContainText('Route schematic');
  expect(await page.evaluate(async()=>(await window.testMap.getSource('pathly-route').getData()).features[0].geometry.coordinates.length)).toBe(2);
  await page.evaluate(()=>new Promise((resolve,reject)=>{const gl=window.testMap;const timer=setTimeout(()=>reject(new Error('Map render timeout')),25000);gl.once('idle',()=>{clearTimeout(timer);resolve()});gl.triggerRepaint()}));
  await page.evaluate(()=>new Promise((resolve,reject)=>{let gl;window.testMap.eachLayer(l=>{if(l.getMaplibreMap)gl=l.getMaplibreMap()});const timer=setTimeout(()=>reject(new Error('Map render timeout')),25000);gl.once('idle',()=>{clearTimeout(timer);resolve()});gl.triggerRepaint()}));
  await page.screenshot({path:`test-results/map-${cities[i].id}.png`});
 }
 await page.evaluate(()=>{window.setLanguage('zh');window.setCity(3)});
 await expect(page.locator('.amap-container')).toBeVisible({timeout:45000});
 await expect(page.locator('.pathly-map-marker')).toHaveCount(2,{timeout:45000});
 await expect(page.locator('.world-map')).toHaveCount(0);
 await expect(page.locator('.real-map-caption')).toContainText('已定位',{timeout:45000});
 await page.locator('.pathly-map-marker').first().click();
 await expect(page.locator('#chosen')).toHaveText('palace');
 await expect(page.locator('.real-map-caption')).toContainText('已定位',{timeout:45000});
 await page.locator('.pathly-map-marker').first().click();
 await expect(page.locator('#chosen')).toHaveText('palace');
 await page.evaluate(()=>window.setLanguage('en'));
 await expect(page.locator('.pathly-map-marker')).toHaveCount(2);
 await page.screenshot({path:'test-results/map-Beijing.png'});
 expect(errors).toEqual([]);
});
