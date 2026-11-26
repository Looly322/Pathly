export function distanceKm(a, b) {
  if (!a || !b) return 0;
  const rad = (x) => (x * Math.PI) / 180;
  const dlat = rad(b.latitude - a.latitude),
    dlng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dlng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function getRoute(origin, destination, mode = "medium") {
  const distance = distanceKm(origin, destination) * 1.2;
  const walkLimit = { low: 0.7, medium: 1.4, high: 3 }[mode] || 1.4;
  const walking = distance <= walkLimit;
  return {
    distance,
    time:
      distance === 0
        ? 0
        : walking
          ? Math.ceil((distance / 4.5) * 60)
          : Math.ceil(12 + distance * 3),
    walkingDistance: walking ? distance : Math.min(distance, 0.45),
    cost: walking ? 0 : 6,
    polyline: [origin, destination],
    source: "mock",
  };
}
