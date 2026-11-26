import {profiles,VISIT_PROFILE_VERSION,SITE_COMPONENTS} from './visitProfiles.js';
import {haversineDistance} from '../utils/geo.js';
const clean=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s·•（）()\-—]/g,'');
const names=p=>[p.name,p.nameZh,p.nameEnglish,p.nameLocal,...(p.aliases||[])].filter(Boolean);
// quick / standard / deep, minutes. They describe scope, not official facts.
export const VISIT_TYPES={
 themePark:{label:'大型主题乐园',en:'Theme park',range:[360,480,720],fullDay:true,internalBreaks:true},
 majorMuseum:{label:'大型综合博物馆',en:'Major museum',range:[120,240,360]},
 museum:{label:'博物馆与美术馆',en:'Museum / gallery',range:[60,120,180]},
 scenicArea:{label:'大型自然风景区',en:'Large scenic area',range:[180,300,480],internalBreaks:true},
 nationalPark:{label:'国家公园 / 大型户外景区',en:'National park',range:[240,360,600],fullDay:true,internalBreaks:true},
 historicComplex:{label:'历史建筑群',en:'Historic complex',range:[120,180,300]},
 historicBuilding:{label:'历史建筑',en:'Historic building',range:[30,60,90]},
 cityPark:{label:'城市公园',en:'City park',range:[45,90,150]},
 district:{label:'街区 / 步行街',en:'Walking district',range:[45,90,150]},
 viewpoint:{label:'观景台',en:'Observation deck',range:[30,60,90]},
 religious:{label:'寺庙 / 宗教建筑',en:'Religious site',range:[30,60,120]},
 landmark:{label:'城市地标',en:'City landmark',range:[15,30,60]},
 restaurant:{label:'餐厅',en:'Restaurant',range:[30,60,90]},
 cafe:{label:'咖啡馆',en:'Café',range:[30,45,75]},
 unknown:{label:'信息不足的景点',en:'Unclassified place',range:[45,90,150]},
};
export function verifiedProfile(p){return profiles.find(v=>(!p.countryCode||p.countryCode===v.country)&&haversineDistance(p,{latitude:v.lat,longitude:v.lng})<4&&names(p).some(n=>v.names.some(alias=>clean(n)===clean(alias))));}
export function visitProfile(p){
 const verified=verifiedProfile(p);
 const types=[...(p.categories||[]).map(v=>v.name),p.type,p.featureType,p.poiCategory,p.tourism,p.leisure,p.boundary,p.category].join(' ');
 const name=names(p).join(' '),text=types+' '+name;
 let type=verified?.type;
 if(!type){
  if(/hotel|酒店|宾馆|商店|gift shop|parking|停车场/i.test(types))type='unknown';
  else if(/theme_park|theme park|主题[公乐]园|游乐园|游乐场|迪士尼乐园$|disneyland$|universal studios$|环球影城$/i.test(text))type='themePark';
  else if(/national.?park|国家公园|国家森林公园/i.test(text))type='nationalPark';
  else if(/nature_reserve|scenic.?area|风景名胜区|自然保护区|风景区|国家级.*景区/i.test(text))type='scenicArea';
  else if(/major.?museum|大型博物馆/i.test(text))type='majorMuseum';
  else if(/museum|gallery|博物馆|美术馆|画廊/i.test(text))type='museum';
  else if(/archaeological|historic.?complex|遗址群|建筑群|古镇|古城|宫殿群/i.test(text))type='historicComplex';
  else if(/temple|shrine|church|cathedral|mosque|寺|教堂|神社|清真/i.test(text))type='religious';
  else if(/observation|viewpoint|观景台|展望台/i.test(text))type='viewpoint';
  else if(/cafe|café|coffee|咖啡/i.test(text))type='cafe';
  else if(/restaurant|FOOD|餐厅|餐馆|饭馆/i.test(text))type='restaurant';
  else if(/street|district|pedestrian|步行街|街区|商业街|CITY_WALK|SHOPPING/i.test(text))type='district';
  else if(/park|garden|公园|花园|植物园/i.test(text))type='cityPark';
  else if(/palace|castle|historic|古建筑|历史建筑|城堡|宫殿/i.test(text))type='historicBuilding';
  else if(/monument|sculpture|statue|fountain|地标|雕塑|纪念碑|喷泉/i.test(text))type='landmark';
  else type='unknown';
 }
 const base=VISIT_TYPES[type];
 return {...base,type,range:verified?.range||base.range,profileId:verified?.key||null,version:VISIT_PROFILE_VERSION,basis:verified?'reviewed-profile':type==='unknown'?'fallback':'type-rule',confidence:verified?'medium':'low',sources:verified?[verified.source]:[p.sourceUrl,p.website].filter(v=>/^https:\/\//.test(v||'')),reviewedAt:verified?'2026-11-10':null,estimated:true};
}
export function withVisitProfile(p){const visit=visitProfile(p);const verified=verifiedProfile(p);return {...p,aliases:[...new Set([...(p.aliases||[]),...(verified?.names||[])])],visit,estimatedDuration:visit.range[1],minimumDuration:visit.range[0],durationEstimated:true,large:visit.range[1]>=180};}
export function visitDuration(p,settings,pace='balanced',item={}){
 const pref=settings.visitPreferences?.[p.id],profile=p.visit||visitProfile(p);
 if(!p.visit&&!pref)return item.duration||Math.max(p.minimumDuration||15,Math.round((p.estimatedDuration||90)*({relaxed:1.15,balanced:1,efficient:.9}[pace]||1)/5)*5);
 if(Number.isFinite(pref?.minutes))return Math.max(15,pref.minutes);
 if(Number.isFinite(item.duration))return item.duration;
 if(pref?.depth)return profile.range[{quick:0,standard:1,deep:2}[pref.depth]??1];
 // A park day is never shortened by an efficient pace. Long scopes already include breaks.
 const base=profile.fullDay?profile.range[1]:Math.max(profile.range[0],Math.round((p.estimatedDuration||profile.range[1])*({relaxed:1.15,balanced:1,efficient:.9}[pace]||1)/15)*15);
 return Math.max(base,settings.party==='family'||settings.party==='seniors'?profile.range[1]:0);
}
// Containment is NOT identity deduplication. Never infer containment from distance alone.
export function parentProfile(p){return profiles.find(v=>(!p.countryCode||p.countryCode===v.country)&&haversineDistance(p,{latitude:v.lat,longitude:v.lng})<2&&names(p).some(n=>v.names.some(a=>clean(n)!==clean(a)&&clean(n).startsWith(clean(a))&&clean(a).length>3)));}
export function containedBy(child,parent){if(child.id===parent.id)return false;
 // Provider-qualified subsite names are evidence only within the parent grounds.
 if(!['FOOD','CAFE','HOTEL'].includes(parent.category)&&haversineDistance(child,parent)<.5&&names(child).some(n=>names(parent).some(a=>a.length>=3&&n.startsWith(a+'-'))))return true;if(child.parentId===parent.id||child.partOf===parent.wikidata&&parent.wikidata)return true;const profile=parent.visit?.profileId||verifiedProfile(parent)?.key;const component=SITE_COMPONENTS[profile];
 if(component&&haversineDistance(child,parent)<component.radius&&names(child).some(n=>component.names.some(a=>clean(n)===clean(a))))return true;
 return !!profile&&parentProfile(child)?.key===profile;}
export function collapseContained(places,required=[]){const covered=[];const kept=places.filter(child=>{const parent=places.find(p=>p!==child&&containedBy(child,p));if(!parent)return true;covered.push({id:child.id,name:child.name,parentId:parent.id,parentName:parent.name});return false;});return {places:kept,covered};}
