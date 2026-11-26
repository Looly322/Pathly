import { language, t } from '../i18n';
export function countryName(city) {
  try { return new Intl.DisplayNames([language.value === 'zh' ? 'zh-Hans' : 'en'], {type:'region'}).of(city.countryCode); }
  catch { return city.country || city.countryCode; }
}
export function cityName(city) { return language.value === 'zh' ? city.nameZh || city.name : city.name; }
export function regionName(city) { return language.value === 'zh' ? city.regionZh || city.region : city.region; }
const translations = { 'Museum':'博物馆','History Museum':'历史博物馆','Art Museum':'艺术博物馆','Monument':'纪念建筑','Scenic Lookout':'观景点','Historic and Protected Site':'历史保护遗址','Palace':'宫殿','Park':'公园','Garden':'花园','Plaza':'广场','Pedestrian Plaza':'步行广场','Church':'教堂','Cathedral':'大教堂','Fountain':'喷泉','Bridge':'桥梁','Temple':'寺庙','Shrine':'神社','Buddhist Temple':'佛教寺庙','Restaurant':'餐厅','French Restaurant':'法国餐厅','Café':'咖啡馆','Coffee Shop':'咖啡店','Hotel':'酒店','Shopping Mall':'购物中心','Department Store':'百货商场','Art Gallery':'美术馆','Theater':'剧院','Opera House':'歌剧院','Wine Bar':'葡萄酒吧','Gym':'健身房','Bookstore':'书店','Gift Store':'礼品店' };
export function categoryLabel(place) {
  if (language.value !== 'zh') return place.categories?.map(c=>c.name).join(' / ') || t('global.unknown');
  return [...new Set((place.categories || []).map(c=>translations[c.name] || (/[^\x00-\x7F]/.test(c.name) && /[\u3400-\u9fff]/.test(c.name) ? c.name : t('global.localPlace'))))].join(' / ') || t('global.localPlace');
}
export function placeName(place) { return language.value === 'zh' ? place.nameZh || (/[\u3400-\u9fff]/.test(place.name) ? place.name : categoryLabel(place)) : place.name; }
