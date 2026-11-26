// SDK 仅在用户进入真实地图页时加载。密钥不进入日志、错误信息或仓库。
export const amapConfig = {
  key: (import.meta.env?.VITE_AMAP_KEY || '').trim(),
  securityCode: (import.meta.env?.VITE_AMAP_SECURITY_CODE || '').trim(),
};
export function isAmapConfigured() { return Boolean(amapConfig.key && amapConfig.securityCode); }
let loadPromise = null;
let loader = null;
let needsReset = false;
export function withTimeout(promise, code, ms = 20000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(code)), ms);
  })]).finally(() => clearTimeout(timer));
}
export function loadAmap() {
  if (!isAmapConfigured()) return Promise.reject(new Error('AMAP_NOT_CONFIGURED'));
  if (!loadPromise) {
    loadPromise = (async () => {
      loader = (await import('@amap/amap-jsapi-loader')).default;
      if (needsReset) { loader.reset(); needsReset = false; }
      // 必须在 JS API 脚本注入之前设置。
      window._AMapSecurityConfig = { securityJsCode: amapConfig.securityCode };
      return withTimeout(loader.load({key:amapConfig.key, version:'2.0',
        plugins:['AMap.PlaceSearch','AMap.DistrictSearch','AMap.Scale','AMap.ToolBar']}), 'AMAP_LOAD_FAILED');
    })().catch(() => {
      loadPromise = null; needsReset = true;
      throw new Error('AMAP_LOAD_FAILED');
    });
  }
  return loadPromise;
}
