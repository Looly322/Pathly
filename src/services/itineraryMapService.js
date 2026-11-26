import {searchPlaces} from "./placeService.js";
// 演示坐标不用于真实地图；只有明确同名、且结果唯一的 POI 才自动匹配。
const aliases = {
  故宫: ["故宫博物院"],
  西湖: ["西湖风景名胜区", "西湖风景区"],
};
export function isDemoPlace(place) {
  return Boolean(place.demo || /演示|\(demo\)/i.test(place.name || ""));
}
export function selectExactPoi(place, candidates) {
  const names = [place.name, ...(aliases[place.name] || [])];
  for (const name of names) {
    const matches = candidates.filter((p) => p.name === name);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return null;
  }
  return null;
}
const cache = new Map();
export async function resolveItineraryPlace(place, city, cityCode) {
  if (isDemoPlace(place)) return { place: null, candidates: [] };
  if (place.source === "amap") return { place, candidates: [] };
  const key = JSON.stringify([cityCode || city, place.name]);
  if (cache.has(key)) return cache.get(key);
  const results = await searchPlaces(city, place.name, { cityCode });
  const exact = selectExactPoi(place, results);
  const result = { place: exact, candidates: results.slice(0, 5) };
  // 未匹配不缓存，允许重试；不把搜索第一项误当目标地点。
  if (exact) cache.set(key, result);
  return result;
}
