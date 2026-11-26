// OpenFreeMap/OpenMapTiles 同时存在冒号和下划线形式的语言字段。
export const WORLD_MAP_STYLE='https://tiles.openfreemap.org/styles/liberty';
export function mapNameExpression(language) {
  const keys=language==='zh'?['name:zh-Hans','name:zh','name_zh','name:zh-Hant']:language==='en'?['name:en','name_en']:[];
  // 空字符串也需要回退；每个地名只显示一种语言，避免原样式拼接多语言。
  return ['case',...[...keys,'name','name:latin'].flatMap(key=>[['!=',['coalesce',['get',key],''],''],['to-string',['get',key]]]),''];
}
export function mapPlaceName(place,language) {
  return language==='zh'?(place.nameZh||place.nameLocal||place.name):language==='en'?(place.nameEnglish||place.nameEn||place.name):(place.nameLocal||place.name);
}
export function applyWorldMapStyle(gl,language) {
  for(const item of gl.getStyle()?.layers||[]) {
    const fills={water:'#d6e8ed',park:'#e3ecdf',landcover_wood:'#dde8d8',building:'#e9e7e2'};
    if(item.type==='fill'&&fills[item.id])gl.setPaintProperty(item.id,'fill-color',fills[item.id]);
    const field=item.layout?.['text-field'];
    if(item.type!=='symbol'||!field||!/name/.test(JSON.stringify(field)))continue;
    gl.setLayoutProperty(item.id,'text-field',mapNameExpression(language));
    gl.setLayoutProperty(item.id,'text-allow-overlap',false);
    gl.setLayoutProperty(item.id,'text-padding',5);
  }
}
