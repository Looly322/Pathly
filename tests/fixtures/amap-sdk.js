// 仅由 Playwright 的网络拦截注入。生产代码不会导入此文件。
export const fixtureState={maps:[],lines:[],queries:[]};
window.__amapFixture=fixtureState;
class Events {
 constructor(){this.handlers={};}
 on(event,callback){(this.handlers[event] ||= []).push(callback);}
 emit(event,payload){this.handlers[event]?.forEach(fn=>fn(payload));}
}
class FakeMap extends Events {
 constructor(el,options){super();this.el=el;this.options=options;this.center=options.center;this.zoom=options.zoom;this.el.classList.add('fixture-map');this.el.style.background='#e8ede8';this.el.addEventListener('click',e=>{if(e.target.closest('.pathly-map-marker'))return;this.emit('click',{lnglat:{getLng:()=>120.12,getLat:()=>30.24}})});fixtureState.maps.push(this);setTimeout(()=>this.emit('complete'),10);}
 addControl(){} setZoomAndCenter(zoom,center){this.zoom=zoom;this.center=center;}
 setDefaultCursor(value){this.el.style.cursor=value;} setFitView(){this.fitted=true;}
 destroy(){this.destroyed=true;this.el.replaceChildren();}
}
class Marker extends Events {
 constructor(options){super();this.options=options;this.wrapper=document.createElement('div');this.wrapper.style.cssText='display:inline-block;margin:18px';this.wrapper.addEventListener('click',e=>{e.stopPropagation();this.emit('click')});this.setContent(options.content);}
 setMap(map){this.map=map;if(map)map.el.append(this.wrapper);else this.wrapper.remove();}
 setContent(content){this.wrapper.replaceChildren(content);} setPosition(position){this.options.position=position;} setzIndex(){}
}
class Polyline {
 constructor(options){this.options=options;fixtureState.lines.push(this);}
 setPath(path){this.options.path=path;} setOptions(options){Object.assign(this.options,options);} setMap(map){this.map=map;}
}
class DistrictSearch {
 search(city,callback){const delay=city==='慢城市'?250:5;setTimeout(()=>{
 if(city==='不存在城市')return callback('no_data',{});
 callback('complete',{districtList:[{name:city,level:'city',adcode:city==='成都'?'510100':'330100',center:{lng:city==='成都'?104.06:120.15,lat:city==='成都'?30.66:30.25}}]});},delay);}
}
class PlaceSearch {
 constructor(options){this.options=options;}
 search(keyword,callback){fixtureState.queries.push({keyword,...this.options});const delay=keyword==='慢结果'?250:5;setTimeout(()=>{
 if(keyword==='无结果')return callback('no_data',{});
 if(keyword==='搜索失败')return callback('error',{info:'TEST_ERROR'});
 const coords={'西湖':[120.14,30.25],'灵隐寺':[120.10,30.24],'小河直街':[120.15,30.31]};
 const [lng,lat]=coords[keyword]||[120.16,30.26];
 callback('complete',{poiList:{pois:[{id:keyword,name:keyword,address:'测试地址',type:'测试类型',location:{lng,lat}}]}});
 },delay);}
}
export const AMap={Map:FakeMap,Marker,Polyline,DistrictSearch,PlaceSearch,Scale:class{},ToolBar:class{}};
export function isAmapConfigured(){return true;}
export async function loadAmap(){return AMap;}
export function withTimeout(promise){return promise;}
