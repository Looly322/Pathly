import { loadAmap, withTimeout } from './amapService.js';
import { hasValidCoordinates } from '../utils/geo.js';
const text = value => typeof value === 'string' ? value : '';
export function normalizePoi(poi, city) {
  // 不补造评分、价格、人流等字段。60 分钟只是用户可参考的计划默认值。
  const location = poi?.location;
  const rawLng = location?.getLng?.() ?? location?.lng;
  const rawLat = location?.getLat?.() ?? location?.lat;
  const coordinate = value => (typeof value === 'number' || (typeof value === 'string' && value.trim())) ? Number(value) : NaN;
  const place = {
    id: `amap-${text(poi?.id)}`, poiId:text(poi?.id), name:text(poi?.name), city,
    category:'poi', address:text(poi?.address), latitude:coordinate(rawLat), longitude:coordinate(rawLng),
    source:'amap', userAdded:false, locked:false, estimatedStay:60,
  };
  if (!place.poiId || !place.name || !hasValidCoordinates(place)) return null;
  if (text(poi.type)) place.type = poi.type;
  if (text(poi.tel)) place.tel = poi.tel;
  if (Array.isArray(poi.photos)) place.photos = poi.photos.filter(p=>text(p.url)).map(p=>({url:p.url,title:text(p.title)}));
  if (poi.distance !== '' && poi.distance != null && !Array.isArray(poi.distance) && Number.isFinite(Number(poi.distance))) place.distance = Number(poi.distance);
  return place;
}
export async function searchPlaces(city, keyword, options = {}) {
  if (!city?.trim() || !keyword?.trim()) return [];
  const AMap = await loadAmap();
  const query = new AMap.PlaceSearch({city:options.cityCode || city,citylimit:true,pageSize:10,pageIndex:1,extensions:'all',languageCode:options.language === 'en' ? 'en' : 'zh_cn'});
  const result = await withTimeout(new Promise((resolve, reject) => {
    query.search(keyword.trim(), (status, data) => {
      if (status === 'no_data') return resolve([]);
      if (status !== 'complete') return reject(new Error('POI_SEARCH_FAILED'));
      const seen = new Set();
      resolve((data?.poiList?.pois || []).map(p=>normalizePoi(p,city)).filter(p=>{
        if (!p || seen.has(p.id)) return false;
        seen.add(p.id); return true;
      }));
    });
  }), 'POI_SEARCH_FAILED');
  return result;
}
