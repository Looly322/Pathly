// 使用明确起终点，不使用用户当前位置；仅打开查询，不伪造站点或预计时间。
export function transitUrl(origin, destination) {
  const coordinate = p => {
    const lat=Number(p.latitude), lng=Number(p.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180) throw new Error('Invalid coordinate');
    return `${lat},${lng}`;
  };
  return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin:coordinate(origin),destination:coordinate(destination),travelmode:'transit'});
}
