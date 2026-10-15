import { getRoute } from "../services/routeService.js";
export const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export const formatTime = (value) =>
  `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}${value >= 1440 ? " +1" : ""}`;
export function planningCost(place) {
  return place.price ?? place.costEstimate ?? 0;
}
export function estimatedCrowd(place, date, start) {
  if (place.crowdSource === "unknown") return null;
  // 模拟人流：基础等级、热度、周末与安排时段共同影响，不是实时数据。
  const weekend = [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
  return Math.max(
    5,
    Math.min(
      95,
      { low: 20, medium: 45, high: 70 }[place.crowdLevel] +
        place.heat * 0.12 +
        (weekend ? 10 : 0) +
        (start >= 660 && start < 960 ? 10 : -12),
    ),
  );
}
export function schedule(items, settings, buffer = 10) {
  let cursor = toMinutes(settings.start),
    cost = 0,
    distance = 0,
    totalDistance = 0,
    travel = 0,
    buffers = 0;
  const stops = items.map((item, i) => {
    const route = i
      ? getRoute(
          items[i - 1].place,
          item.place,
          settings.preferences.includes("less") ? "low" : settings.walking,
        )
      : { time: 0, distance: 0, walkingDistance: 0, cost: 0 };
    const gap = i ? buffer : 0;
    const delay = Math.max(-gap, item.delay || 0);
    cursor += route.time + gap + delay;
    buffers += gap + delay;
    travel += route.time;
    distance += route.walkingDistance;
    totalDistance += route.distance;
    cost += planningCost(item.place) + route.cost;
    // 夜景使用模拟最早到访时间，避免上午出现夜景行程。
    const waiting =
      item.place.category === "night" ? Math.max(0, 17 * 60 - cursor) : 0;
    cursor += waiting;
    buffers += waiting;
    const start = cursor;
    cursor += item.duration;
    return {
      ...item,
      start,
      end: cursor,
      route,
      waiting,
      crowd: estimatedCrowd(item.place, settings.date, start),
    };
  });
  const end = toMinutes(settings.end),
    free = Math.max(0, end - cursor);
  return {
    stops,
    cost,
    distance: +distance.toFixed(1),
    totalDistance,
    travel,
    buffers,
    free,
    overflow: Math.max(0, cursor - end),
    occupied: cursor - toMinutes(settings.start),
    crowding: stops.some((s) => s.crowd == null)
      ? null
      : stops.length
        ? Math.round(stops.reduce((s, p) => s + p.crowd, 0) / stops.length)
        : 0,
  };
}
export function orderPlacesByNearestNeighbor(places, first) {
  const remaining = [...places],
    ordered = [];
  if (first) {
    const i = remaining.findIndex((p) => p.id === first.id);
    if (i >= 0) ordered.push(...remaining.splice(i, 1));
  }
  while (remaining.length) {
    const last = ordered.at(-1);
    let best = 0;
    if (last)
      remaining.forEach((p, i) => {
        if (
          getRoute(last, p).distance < getRoute(last, remaining[best]).distance
        )
          best = i;
      });
    ordered.push(...remaining.splice(best, 1));
  }
  return ordered;
}
