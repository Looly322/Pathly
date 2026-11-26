import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapNameExpression,mapPlaceName,applyWorldMapStyle} from '../src/utils/mapStyle.js';
test('map labels use one preferred language and local fallback, skipping empty translations',()=>{
 const zh=JSON.stringify(mapNameExpression('zh')),en=JSON.stringify(mapNameExpression('en'));
 assert.ok(zh.indexOf('name:zh-Hans')<zh.indexOf('name:latin'));assert.ok(en.includes('name:en'));assert.ok(!zh.includes('concat'));assert.ok(!en.includes('name:zh'));assert.ok(zh.includes('case'));
 const place={name:'local',nameZh:'中文',nameEnglish:'English'};
 assert.equal(mapPlaceName(place,'zh'),'中文');assert.equal(mapPlaceName(place,'en'),'English');assert.equal(mapPlaceName({name:'local'},'zh'),'local');
});
test('style reduces minor-label density without translating highway reference numbers',()=>{
 const calls=[];const gl={getStyle:()=>({layers:[{id:'highway-name-minor',type:'symbol',layout:{'text-field':['get','name']}},{id:'shield',type:'symbol',layout:{'text-field':['get','ref']}}]}),setLayoutProperty:(...a)=>calls.push(a),setLayerZoomRange:(...a)=>calls.push(a)};
 applyWorldMapStyle(gl,'en');assert.ok(calls.some(a=>a[1]===16));assert.ok(!calls.some(a=>a[0]==='shield'));
});
