import {loadAmap,withTimeout} from "./amapService.js";
import {hasValidCoordinates} from "../utils/geo.js";
const text = (value) => (typeof value === "string" ? value : "");
export function normalizePoi(poi, city) {
  // 不补造评分、价格、人流等字段。60 分钟只是用户可参考的计划默认值。
  const location = poi?.location;
  const rawLng = location?.getLng?.() ?? location?.lng;
  const rawLat = location?.getLat?.() ?? location?.lat;
  const coordinate = (value) =>
    typeof value === "number" || (typeof value === "string" && value.trim())
      ? Number(value)
      : NaN;
  const place = {
    id: `amap-${text(poi?.id)}`,
    poiId: text(poi?.id),
    sourceId: text(poi?.id),
    coordinateSystem: "GCJ02",
    nameLocal: null,
    nameEnglish: null,
    country: null,
    countryCode: "CN",
    region: text(poi?.pname) || null,
    categories: text(poi?.type).split(";").filter(Boolean).map((name) => ({ id: null, name })),
    website: text(poi?.website) || null,
    distance: null,
    name: text(poi?.name),
    city,
    category: "poi",
    address: text(poi?.address),
    latitude: coordinate(rawLat),
    longitude: coordinate(rawLng),
    source: "amap",
    userAdded: false,
    locked: false,
    estimatedStay: 60,
  };
  if (!place.poiId || !place.name || !hasValidCoordinates(place)) return null;
  if (text(poi.type)) place.type = poi.type;
  if (text(poi.tel)) place.tel = poi.tel;
  if (Array.isArray(poi.photos))
    place.photos = poi.photos
      .filter((p) => text(p.url))
      .map((p) => ({ url: p.url, title: text(p.title) }));
  if (
    poi.distance !== "" &&
    poi.distance != null &&
    !Array.isArray(poi.distance) &&
    Number.isFinite(Number(poi.distance))
  )
    place.distance = Number(poi.distance);
  return place;
}
export async function searchPlaces(city, keyword, options = {}) {
  if (!city?.trim() || (!keyword?.trim() && !options.type)) return [];
  const AMap = await loadAmap();
  const query = new AMap.PlaceSearch({
    city: options.cityCode || city,
    citylimit: true,
    ...(options.type ? { type: options.type } : {}),
    pageSize: options.pageSize || 10,
    pageIndex: options.pageIndex || 1,
    extensions: "all",
    languageCode: options.language === "en" ? "en" : "zh_cn",
  });
  const result = await withTimeout(
    new Promise((resolve, reject) => {
      const callback = (status, data) => {
        if (status === "no_data") return resolve([]);
        if (status !== "complete")
          return reject(new Error("POI_SEARCH_FAILED"));
        const seen = new Set();
        resolve(
          (data?.poiList?.pois || [])
            .map((p) => normalizePoi(p, city))
            .filter((p) => {
              if (!p || seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            }),
        );
      };
      if(options.center)query.searchNearBy(keyword.trim(),[options.center.longitude,options.center.latitude],options.radius||1500,callback);
      else query.search(keyword.trim(),callback);
    }),
    "POI_SEARCH_FAILED", options.timeout || 12000,
  );
  return result;
}

export async function getPlaceDetails(poiId, city) {
  const AMap = await loadAmap();
  return withTimeout(
    new Promise((resolve, reject) => {
      new AMap.PlaceSearch({ extensions: "all" }).getDetails(
        poiId,
        (status, data) => {
          const place =
            status === "complete" &&
            normalizePoi(data?.poiList?.pois?.[0], city);
          if (place) resolve(place);
          else reject(new Error("POI_DETAILS_FAILED"));
        },
      );
    }),
    "POI_DETAILS_FAILED",
  );
}
export async function identifyMapPoint(point, city, hotspot = null) {
  if (!hasValidCoordinates(point)) throw new Error("INVALID_COORDINATES");
  // 点击底图命名热点时用 POI ID 精确查询，不能用最近的店名冒充点击地点。
  if (hotspot?.id) {
    try {
      return { place: await getPlaceDetails(hotspot.id, city), candidates: [] };
    } catch {
      const place = normalizePoi(
        {
          id: hotspot.id,
          name: hotspot.name,
          location: { lng: point.longitude, lat: point.latitude },
        },
        city,
      );
      if (place) return { place, candidates: [] };
    }
  }
  const AMap = await loadAmap();
  return withTimeout(
    new Promise((resolve, reject) => {
      new AMap.Geocoder({ radius: 120, extensions: "all" }).getAddress(
        [point.longitude, point.latitude],
        (status, result) => {
          if (status !== "complete")
            return reject(new Error("POINT_LOOKUP_FAILED"));
          const geo = result.regeocode;
          const candidates = (geo?.pois || [])
            .map((p) => normalizePoi(p, city))
            .filter(Boolean)
            .filter((p) => p.distance == null || p.distance <= 120)
            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
            .slice(0, 5);
          resolve({
            place: null,
            address: geo?.formattedAddress || "",
            candidates,
          });
        },
      );
    }),
    "POINT_LOOKUP_FAILED",
  );
}
