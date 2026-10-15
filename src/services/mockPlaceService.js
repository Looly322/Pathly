import { cityData, createDemoPlaces } from "../data/mockPlaces/index.js";
import { resolveCity } from "./cityService.js";
import { USE_MOCK_DATA } from "../config/appConfig.js";
export function searchPlaces(city, interests = []) {
  if (!USE_MOCK_DATA) throw new Error("Real POI service is not implemented");
  const resolved = resolveCity(city);
  // 保留完整候选集，兴趣用于算法评分，避免过滤掉用户种草地点。
  return resolved.supported
    ? cityData[resolved.key].map((p) => ({ ...p }))
    : createDemoPlaces(city);
}
export function searchPlaceByName(city, keyword) {
  return (
    searchPlaces(city).find(
      (p) =>
        !p.demo &&
        [p.name, p.nameEn, ...(p.aliases || [])].some(
          (n) => n.toLowerCase() === keyword.trim().toLowerCase(),
        ),
    ) || null
  );
}
