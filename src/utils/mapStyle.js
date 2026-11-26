// OpenFreeMap/OpenMapTiles 同时存在冒号和下划线形式的语言字段。
export const WORLD_MAP_STYLE='https://tiles.openfreemap.org/styles/positron';
export function mapNameExpression(language) {
  const keys=language==='zh'?['name:zh-Hans','name:zh','name_zh','name:zh-Hant']:language==='en'?['name:en','name_en']:[];
  // 空字符串也需要回退；每个地名只显示一种语言，避免原样式拼接多语言。
  return ['coalesce',...[...keys,'name','name:latin'].map(key=>['case',['!=',['coalesce',['get',key],''],''],['get',key],null]),''];
}
export function mapPlaceName(place,language) {
  return language==='zh'?(place.nameZh||place.nameLocal||place.name):language==='en'?(place.nameEnglish||place.nameEn||place.name):(place.nameLocal||place.name);
}
export function applyWorldMapStyle(gl,language) {
  for(const item of gl.getStyle()?.layers||[]) {
    const field=item.layout?.['text-field'];
    if(item.type!=='symbol'||!field||!/name/.test(JSON.stringify(field)))continue;
    gl.setLayoutProperty(item.id,'text-field',mapNameExpression(language));
    gl.setLayoutProperty(item.id,'text-allow-overlap',false);
    gl.setLayoutProperty(item.id,'text-padding',5);
    // 街道小路与次要行政区只在放大时出现，保留主要道路/城市定位信息。
    const minimum={'highway-name-path':17,'highway-name-minor':16,'label_other':14,'label_village':12}[item.id];
    if(minimum)gl.setLayerZoomRange(item.id,Math.max(item.minzoom||0,minimum),item.maxzoom||24);
  }
}
