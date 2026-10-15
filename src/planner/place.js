// 提供方只负责获取事实；分类和停留假设在这里统一，不补造价格/评分。
export const INTERESTS=['CULTURE','FOOD','NATURE','SHOPPING','ART','CITY_WALK','ENTERTAINMENT','NIGHTLIFE','FAMILY'];
const rules=[
  ['CAFE',/café|cafe|coffee|咖啡/i,['FOOD']],
  ['FOOD',/restaurant|food|dining|bakery|dessert|餐|美食|小吃|甜品|食品/i,['FOOD']],
  ['ART',/art|gallery|美术|艺术|画廊/i,['ART','CULTURE']],
  ['SHOPPING',/shop|mall|market|store|购物|商场|市场|百货/i,['SHOPPING','CITY_WALK']],
  ['FAMILY',/zoo|aquarium|theme park|动物园|水族|游乐园/i,['FAMILY','ENTERTAINMENT','NATURE']],
  ['CULTURE',/museum|histor|monument|palace|temple|shrine|archaeolog|church|cathedral|castle|博物|历史|文物|宫|寺|文化|古迹/i,['CULTURE']],
  ['CITY_WALK',/street|plaza|square|neighborhood|pedestrian|街|巷|广场|步行/i,['CITY_WALK']],
  ['NATURE',/park|garden|nature|beach|公园|自然|植物|风景区/i,['NATURE']],
  ['ENTERTAINMENT',/theater|theatre|entertainment|乐园|剧院|娱乐/i,['ENTERTAINMENT']],
  ['NIGHTLIFE',/night|bar|club|夜|酒吧/i,['NIGHTLIFE']],
];
export function normalizePlace(raw,destination={}) {
  const typeNames=raw.source==='amap'
    ? [...(raw.categories||[]).map(c=>c.name)].reverse()
    : (raw.categories||[]).map(c=>c.name);
  const descriptions=[...typeNames,raw.type,raw.category].filter(Boolean);
  const description=descriptions.join(' ');
  // 高德按最细类别逐级回退：公园优先于“公园广场”，新疆菜可回退“中餐厅”。
  const excluded=/hotel|hostel|lodging|office|parking|exhibit|dog park|酒店|宾馆|停车场|写字楼/i.test(description)||/airport|机场/i.test(raw.name||'');
  const match=descriptions.map(d=>rules.find(([,pattern])=>pattern.test(d))).find(Boolean)
    || rules.find(([,pattern])=>pattern.test(raw.name||''));
  const category=raw.source==='opentripmap'?raw.category:match?.[0] || 'ATTRACTION';
  const subcategories=raw.source==='opentripmap'?raw.subcategories:match?.[2] || [];
  const duration=raw.source==='opentripmap'&&raw.estimatedDuration || {CULTURE:120,ART:120,NATURE:100,FOOD:60,CAFE:45,SHOPPING:75,FAMILY:150,ENTERTAINMENT:90,NIGHTLIFE:60,CITY_WALK:60,ATTRACTION:90}[category];
  return {...raw,id:raw.id,source:raw.source,sourceId:raw.sourceId||raw.poiId||raw.id,name:raw.name,
    latitude:Number(raw.latitude),longitude:Number(raw.longitude),city:raw.city||destination.city,country:raw.country||destination.country,
    planningEligible:!excluded,countryCode:raw.countryCode||destination.countryCode,category,subcategories,
    image:raw.image||raw.photo?.url||raw.photos?.[0]?.url||null,address:raw.address||null,
    estimatedDuration:raw.minimumStay ? Math.max(duration,raw.minimumStay) : duration,
    minimumDuration:Math.round(duration*.8),durationEstimated:true,
    price:Number.isFinite(raw.price)?raw.price:null,large:duration>=120};
}
export function validPlace(p){return Boolean(p?.id&&p.name&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180);}
