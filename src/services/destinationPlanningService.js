import {isCoffeePlace} from "../utils/placeFilters.js";
import {resolveMapCity} from "./cityService.js";
import {searchPlaces} from "./placeService.js";
// 缺失评分 / 票价 / 营业时间保留为空。仅在 planning 字段存储可解释的预算和停留假设。
const defaults = {
  nature: [120, 60, 50],
  museum: [120, 90, 50],
  culture: [90, 60, 40],
  oldtown: [90, 45, 30],
  coffee: [45, 30, 40],
  food: [60, 30, 80],
  reading: [60, 30, 30],
  night: [60, 45, 30],
};
export function toPlanningPlace(poi) {
  const type = poi.type || "",
    name = poi.name;
  let category = /咖啡/.test(type + name)
    ? "coffee"
    : /餐饮/.test(type)
      ? "food"
      : /博物|美术馆|展览馆/.test(type + name)
        ? "museum"
        : /图书馆|书店/.test(type + name)
          ? "reading"
          : /古街|古镇|历史文化街|老街/.test(name)
            ? "oldtown"
            : /公园|植物园|动物园|风景区|自然景观/.test(type)
              ? "nature"
              : "culture";
  const [estimatedStay, minimumStay, costEstimate] = defaults[category];
  return {
    ...poi,
    category,
    tags: [
      category,
      ...(["nature", "oldtown"].includes(category) ? ["photo"] : []),
    ],
    image: poi.photos?.[0]?.url || "",
    rating: null,
    price: null,
    openingHours: null,
    crowdLevel: null,
    heat: null,
    estimatedStay,
    minimumStay,
    costEstimate,
    planningEstimates: true,
    crowdSource: "unknown",
    coordinateSource: "amap",
    description: "livePlan.placeDescription",
  };
}
export function isUsefulPoi(poi) {
  return (
    !isCoffeePlace(poi) &&
    !/停车场|售票处|检票口|检票处|游客中心|公共厕所|地铁站|公交站|出入口|管理处|卫生间/.test(
      poi.name,
    ) && !/交通设施服务|公共设施|医疗保健服务|公司企业/.test(poi.type || "")
  );
}
const interestQueries = {
  nature: ["公园", "风景名胜"],
  museum: ["博物馆", "科教文化服务"],
  culture: ["博物馆", "科教文化服务"],
  photo: ["风景区", "风景名胜"],
  oldtown: ["古街", "风景名胜"],
  food: ["特色美食", "餐饮服务"],
  reading: ["书店", "购物服务"],
  night: ["公园", "风景名胜"],
  hidden: ["公园", "风景名胜"],
};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
export async function discoverDestination(
  form,
  { onProgress = () => {}, isCancelled = () => false } = {},
) {
  const cancelled = () => {
    if (isCancelled()) throw new Error("CANCELLED");
  };
  const city = await resolveMapCity(form.selectedCity);
  cancelled();
  const byId = new Map(),
    wishIds = [],
    pending = [],
    warnings = [];
  let requests = 0,
    failed = 0;
  async function query(keyword, type) {
    cancelled();
    if (requests++) await delay(650);
    cancelled();
    onProgress(keyword);
    try {
      return await searchPlaces(city.name, keyword, {
        cityCode: city.adcode,
        type,
      });
    } catch {
      failed++;
      warnings.push(keyword);
      return [];
    }
  }
  for (const name of (form.wishlist || []).slice(0, 8)) {
    const hits = await query(name);
    cancelled();
    const exact = hits.filter((p) => p.name === name && isUsefulPoi(p));
    if (exact.length === 1) {
      byId.set(exact[0].id, toPlanningPlace(exact[0]));
      wishIds.push(exact[0].id);
    } else pending.push(name);
  }
  pending.push(...(form.wishlist || []).slice(8));
  // 一般景区保底 + 用户兴趣，使用行政区限制，不维护一个固定“支持城市”名单。
  const queries = [
    ["", "风景名胜"],
    ...form.interests.map((i) => interestQueries[i]).filter(Boolean),
  ];
  const unique = [
    ...new Map(queries.map((q) => [q.join("|"), q])).values(),
  ].slice(0, 5);
  for (const [keyword, type] of unique) {
    const hits = await query(keyword, type);
    cancelled();
    const limit = keyword ? 3 : 8;
    let added = 0;
    // 不以城市中心半径硬过滤郊区景点；距离与时间可行性交给规划算法。
    for (const hit of hits) {
      if (!isUsefulPoi(hit) || byId.has(hit.id)) continue;
      byId.set(hit.id, toPlanningPlace(hit));
      if (++added >= limit) break;
    }
    if (failed >= 2 && !byId.size) break;
  }
  cancelled();
  if (!byId.size)
    throw new Error(failed ? "DESTINATION_SEARCH_FAILED" : "DESTINATION_EMPTY");
  return {
    places: [...byId.values()].slice(0, 16),
    wishIds,
    pending,
    warnings,
    city,
  };
}
