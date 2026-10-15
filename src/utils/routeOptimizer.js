import { hasValidCoordinates, haversineDistance } from "./geo.js";
export function optimizePlaceOrder(places) {
  // 固定第一个地点作为起点；锁定仅表示必须保留，不固定它的访问顺序。
  if (places.some((place) => !hasValidCoordinates(place)))
    throw new Error("INVALID_COORDINATES");
  const remaining = [...places];
  if (!remaining.length) return [];
  const ordered = [remaining.shift()];
  while (remaining.length) {
    const last = ordered.at(-1);
    let nearest = 0;
    remaining.forEach((place, i) => {
      if (
        haversineDistance(last, place) <
        haversineDistance(last, remaining[nearest])
      )
        nearest = i;
    });
    ordered.push(remaining.splice(nearest, 1)[0]);
  }
  return ordered;
}
