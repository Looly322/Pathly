// 所有地图选点使用高德 GCJ-02 坐标；这里只计算球面距离，不是道路长度。
export function hasValidCoordinates(place) {
  return typeof place?.latitude === 'number' && typeof place?.longitude === 'number'
    && Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
    && Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180;
}
export function haversineDistance(a, b) {
  if (!hasValidCoordinates(a) || !hasValidCoordinates(b)) throw new Error('INVALID_COORDINATES');
  const rad = value => value * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2
    + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude))
    * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
export function totalStraightDistance(places) {
  return places.reduce((sum, place, i) => sum + (i ? haversineDistance(places[i - 1], place) : 0), 0);
}
