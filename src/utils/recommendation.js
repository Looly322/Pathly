import {isCoffeePlace} from "./placeFilters.js";
import {getRoute} from "../services/routeService.js";
import {analyzeRegion,isAttraction} from "./regionPlanning.js";
import {schedule,orderPlacesByNearestNeighbor,planningCost,} from "./itinerary.js";
export const WEIGHTS = {
  interest: 22,
  crowd: 14,
  rating: 8,
  budget: 12,
  distance: 10,
  wishlist: 150,
  hidden: 15,
};
export const STYLES = {
  explorer: { max: 7, stay: 0.85, buffer: 6, crowd: 0.4 },
  slow: { max: 4, stay: 1.35, buffer: 25, crowd: 1 },
  crowd: { max: 5, stay: 1, buffer: 15, crowd: 4 },
};
export function calculatePlaceScore(place, prefs) {
  const style = STYLES[prefs.style] || STYLES.explorer;
  const matches = place.tags.filter((t) => prefs.interests.includes(t)).length;
  const crowd = { low: 1, medium: 0.45, high: 0 }[place.crowdLevel] ?? 0;
  const distance = prefs.anchor
    ? getRoute(prefs.anchor, place, prefs.walking).distance
    : 0;
  return (
    matches * WEIGHTS.interest +
    crowd *
      WEIGHTS.crowd *
      style.crowd *
      (prefs.preferences.includes("avoid") ? 2 : 1) +
    (place.rating ?? 0) *
      WEIGHTS.rating *
      (prefs.preferences.includes("rating") ? 1.5 : 1) +
    Math.max(0, 1 - planningCost(place) / Math.max(1, prefs.budget)) *
      WEIGHTS.budget *
      (prefs.preferences.includes("budget") ? 2 : 1) +
    WEIGHTS.distance /
      (1 +
        distance *
          (prefs.walking === "low" || prefs.preferences.includes("less")
            ? 2
            : 1)) +
    (prefs.wishIds?.includes(place.id) ? WEIGHTS.wishlist : 0) +
    (place.tags.includes("hidden") &&
    (prefs.style === "crowd" || prefs.preferences.includes("hidden"))
      ? WEIGHTS.hidden
      : 0) -
    (prefs.style === "crowd" ? (place.heat ?? 0) * 0.2 : 0)
  );
}
export function recommendationReasons(place, prefs) {
  const out = [];
  const tags = place.tags.filter((x) => prefs.interests.includes(x));
  if (prefs.wishIds.includes(place.id)) out.push({ key: "reasonWish" });
  if (tags.length) out.push({ key: "reasonInterest", tags });
  if (place.crowdLevel === "low") out.push({ key: "reasonCrowd" });
  if (place.rating >= 4.5)
    out.push({ key: "reasonRating", params: { n: place.rating } });
  if (place.price != null && place.price <= prefs.budget)
    out.push({ key: "reasonBudget", params: { n: place.price } });
  return out.length ? out : [{ key: "reasonDistance" }];
}
// 先完成白天 / 夜景排序，再验证时间；不能让夜景候选的等待时间挤掉白天景点。
function orderedRoute(items, prefs, styleId, buffer) {
  const day = items.filter((s) => s.place.category !== "night");
  const night = items.filter((s) => s.place.category === "night");
  const starts = day.length ? day : night.slice(0, 1);
  let best = null,
    bestValue = -Infinity;
  for (const first of starts) {
    const daytime = orderPlacesByNearestNeighbor(
      day.map((s) => s.place),
      first.place,
    );
    const nighttime = orderPlacesByNearestNeighbor(night.map((s) => s.place));
    const ordered = [...daytime, ...nighttime].map((p) =>
      items.find((s) => s.place.id === p.id),
    );
    const data = schedule(ordered, prefs, buffer);
    const value =
      -data.overflow * 10000 -
      data.cost * 0.01 -
      data.travel -
      (styleId === "crowd" ? data.crowding * 5 : 0);
    if (value > bestValue) {
      bestValue = value;
      best = { items: ordered, data };
    }
  }
  return best || { items: [], data: schedule([], prefs, buffer) };
}
export function generatePlanVariants(places, prefs, locked = []) {
  places = places.filter((place) => !isCoffeePlace(place));
  const region = analyzeRegion(places);
  const available =
    Number(prefs.end.slice(0, 2)) * 60 +
    Number(prefs.end.slice(3)) -
    (Number(prefs.start.slice(0, 2)) * 60 + Number(prefs.start.slice(3)));
  const locks = [
    ...new Map(
      locked.map((s) => [s.place.id, { ...s, locked: true }]),
    ).values(),
  ];
  const lockedIds = new Set(locks.map((s) => s.place.id));
  const plans = [];
  for (const [id, style] of Object.entries(STYLES)) {
    const settings = { ...prefs, style: id };
    const explorer = plans[0];
    const coverage = explorer?.items.length || 0;
    // 松弛明确减少站点；时间短、锁定点多时诚实保留例外，而不是凑出虚假差异。
    let limit =
      id === "slow"
        ? Math.min(
            style.max,
            Math.max(1, Math.floor(coverage * 0.6)),
            region.kind === "compact" ? 4 : 3,
          )
        : id === "crowd"
          ? Math.min(style.max, Math.max(1, coverage - 1))
          : style.max;
    if (prefs.preferences.includes("relaxed")) limit = Math.max(1, limit - 1);
    limit = Math.max(limit, locks.length);
    const reserve =
      id === "slow" ? Math.min(90, Math.round(available * 0.2)) : 0;
    const maxAttractions =
      id === "slow"
        ? Math.max(
            1,
            Math.floor(
              (explorer?.items.filter((s) => isAttraction(s.place)).length ||
                1) * 0.6,
            ),
          )
        : Infinity;
    // 当前 Mock 每城 8–9 个点，枚举小规模地点组合；未来大候选集先按分数截取，避免指数增长。
    const candidates = places
      .filter((p) => !lockedIds.has(p.id))
      .sort(
        (a, b) =>
          calculatePlaceScore(b, settings) - calculatePlaceScore(a, settings),
      )
      .slice(0, 12);
    let best = orderedRoute(locks, prefs, id, style.buffer),
      bestRank = null;
    function consider(items) {
      const route = orderedRoute(items, prefs, id, style.buffer),
        data = route.data;
      if (data.overflow || data.cost > prefs.budget) return;
      if (
        id === "slow" &&
        items.length > locks.length &&
        (data.free < reserve ||
          items.filter((s) => !s.locked && isAttraction(s.place)).length >
            Math.max(
              0,
              maxAttractions -
                locks.filter((s) => isAttraction(s.place)).length,
            ))
      )
        return;
      const wishCount = items.filter((s) =>
        prefs.wishIds?.includes(s.place.id),
      ).length;
      const attractions = items.filter((s) => isAttraction(s.place)).length;
      const score =
        items.reduce(
          (sum, s) => sum + calculatePlaceScore(s.place, settings),
          0,
        ) / Math.max(1, items.length);
      const utility =
        score -
        data.totalDistance * (id === "slow" ? 12 : 2) -
        data.travel * 0.15 -
        (id === "crowd" ? data.crowding * 6 : 0);
      const rank = [
        wishCount,
        id !== "crowd" ? attractions : items.length,
        items.length,
        utility,
      ];
      if (
        !bestRank ||
        rank.some(
          (v, i) =>
            v !== bestRank[i] &&
            rank.slice(0, i).every((n, j) => n === bestRank[j]) &&
            v > bestRank[i],
        )
      ) {
        bestRank = rank;
        best = route;
      }
    }
    function visit(index, items) {
      consider(items);
      if (items.length >= limit) return;
      for (let i = index; i < candidates.length; i++) {
        const place = candidates[i];
        const minimum =
          place.minimumStay ||
          (["museum", "nature"].includes(place.category) ? 45 : 30);
        const duration = Math.max(
          minimum,
          Math.round((place.estimatedStay * style.stay) / 5) * 5,
        );
        visit(i + 1, [...items, { place, duration, delay: 0, locked: false }]);
      }
    }
    visit(0, locks);
    plans.push({
      id,
      buffer: style.buffer,
      items: best.items,
      region,
      targetLimit: limit,
    });
  }
  return plans;
}
export function replacePlace(currentPlace, places, prefs) {
  return places
    .filter(
      (p) =>
        !isCoffeePlace(p) &&
        p.id !== currentPlace.id &&
        !prefs.excludedIds?.includes(p.id) &&
        (p.category === currentPlace.category ||
          p.tags.some((t) => currentPlace.tags.includes(t))),
    )
    .sort(
      (a, b) =>
        (b.category === currentPlace.category ? 100 : 0) +
        calculatePlaceScore(b, prefs) -
        (a.category === currentPlace.category ? 100 : 0) -
        calculatePlaceScore(a, prefs),
    );
}
