// 只使用地点数据携带的链接，不按名称猜测 Tripadvisor 的景点 ID。
const trustedSources = new Set(['amap', 'opentripmap', 'openstreetmap']);
const hosts = new Set(['tripadvisor.com', 'www.tripadvisor.com', 'www.tripadvisor.co.uk', 'www.tripadvisor.com.hk']);
export function tripadvisorDetailUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !hosts.has(url.hostname) || url.username || url.password || url.port) return null;
    if (!/^\/Attraction_Review-g\d+-d\d+-Reviews(?:-|\.)[^/]*\.html$/.test(url.pathname)) return null;
    // 去掉跟踪参数，保留平台提供的详情路径。
    return url.origin + url.pathname;
  } catch { return null; }
}
export function touristReviewLink(place, destination = {}) {
  const country = destination.country || place.country || destination.countryCode || place.countryCode;
  const parts = [place.name, destination.canonicalName || destination.city || place.city, country];
  const query = [...new Set(parts.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()))].join(' ');
  // 只有现有真实 Provider 提供的官网/来源链接可作为详情依据。
  const direct = trustedSources.has(place.source) && [place.tripadvisorUrl, place.website, place.sourceUrl]
    .map(tripadvisorDetailUrl).find(Boolean);
  return { url: direct || `https://www.tripadvisor.com/Search?${new URLSearchParams({q: query})}`, direct: Boolean(direct), query };
}
