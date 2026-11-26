import { searchPlaces as searchAmapPlaces } from './placeService.js';
import { resolveMapCity } from './cityService.js';

async function api(path, params, signal) {
  const response = await fetch(`/api/${path}?${new URLSearchParams(params)}`, { signal: signal || AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`GLOBAL_${response.status}`);
  return response.json();
}
export async function searchDestinations(query, signal) {
  const data = await api('destinations/search', { q: query }, signal);
  return data.destinations;
}
const amapTypes = {
  attractions: '风景名胜', museums: '博物馆', parks: '公园', landmarks: '风景名胜',
  restaurants: '餐饮服务', coffee: '咖啡厅', shopping: '购物服务', entertainment: '体育休闲服务',
};
export async function searchGlobalPlaces({ destination, query = '', category = '', radius = 15000, limit = 10, signal }) {
  if (destination.countryCode === 'CN') {
    const city = await resolveMapCity(destination.city);
    const places = await searchAmapPlaces(city.name, query, { cityCode: city.adcode, type: amapTypes[category] || '风景名胜' });
    return { places, source: 'amap', queryUsed: query };
  }
  return api('places/search', {
    query, category, city: destination.city, countryCode: destination.countryCode,
    latitude: destination.latitude, longitude: destination.longitude, radius, limit,
  }, signal);
}
