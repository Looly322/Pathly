import {loadAmap,withTimeout} from "./amapService.js";
import {hasValidCoordinates} from "../utils/geo.js";
import {cityNames} from "../data/mockPlaces/index.js";
export function resolveCity(cityName) {
  const name = cityName.trim();
  const key = Object.keys(cityNames).find((key) =>
    [
      key,
      cityNames[key].zh,
      cityNames[key].zh + "市",
      cityNames[key].en.toLowerCase(),
    ].includes(name.toLowerCase()),
  );
  return { name, key, supported: !!key, source: "mock" };
}
export function searchCity(keyword) {
  return keyword.trim() ? [resolveCity(keyword)] : [];
}

// 真实地图使用高德行政区解析，与上面的 Mock 城市判断互不混用。
export async function resolveMapCity(cityName) {
  const name = cityName.trim();
  if (!name) return null;
  const AMap = await loadAmap();
  return withTimeout(
    new Promise((resolve, reject) => {
      const search = new AMap.DistrictSearch({
        level: "city",
        subdistrict: 0,
        extensions: "base",
      });
      search.search(name, (status, result) => {
        if (status !== "complete") return reject(new Error("CITY_NOT_FOUND"));
        const district = result?.districtList?.find((d) =>
          ["city", "district", "province", "street", "town"].includes(d.level),
        );
        const center = district?.center;
        const point = {
          longitude: center?.getLng?.() ?? center?.lng,
          latitude: center?.getLat?.() ?? center?.lat,
        };
        if (!hasValidCoordinates(point) || !district?.adcode)
          return reject(new Error("CITY_NOT_FOUND"));
        resolve({
          name: district.name,
          adcode: district.adcode,
          ...point,
          source: "amap",
        });
      });
    }),
    "CITY_NOT_FOUND",
  );
}
