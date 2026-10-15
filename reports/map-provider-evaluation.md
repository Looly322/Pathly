# Pathly 国外地图技术评估

本轮只增加独立实测脚本及报告，没有修改 src、国内高德组件、现有国外地图、POI 服务或规划算法；没有开通、购买新的地图服务。

## 当前技术

- 高德 SDK：现有 loader 请求 JS API 2.0，现有本地 Key 和安全码，未在报告记录密钥。
- 国外生产页面：Leaflet + MapLibre GL Leaflet 插件 + OpenFreeMap Positron。它已经是矢量渲染，换成原生 MapLibre 本身不会增加中文译名。

## 高德海外实测

复用现有 SDK，在独立浏览器测试页使用官方 showOversea:true、languageCode:zh/en，分别测试城市级 zoom 12、街道级 zoom 16。

|城市|目标中心（经度,纬度）|结果|
|---|---|---|
|巴黎|2.3376,48.8606（卢浮宫附近）|中文、英文均只有空白底图与标记，没有详细道路或 POI|
|东京|139.7454,35.6586（东京塔附近）|同上|
|开罗|31.2336,30.0478（埃及博物馆附近）|同上|
|北京对照|116.3972,39.9163|使用现有国内初始化方式、不传海外/多语言扩展参数，可以显示道路、建筑、水域、景点|

SDK complete 事件只证明地图实例完成初始化，不等于详细瓦片有效。三个海外中心与输入一致；测试中没有定位到美国街道。无法仅凭用户此前提及的街道名确定生产页面当时选中的城市与坐标。

官方文档明确：世界地图是高级地图能力，需要通过工单申请权限并商务咨询。当前 Key 的账号控制台授权信息未读取，不能仅凭空白地图断言确切后台权限状态；现有运行结果未满足使用要求，与缺少高级能力授权相符。SDK 中没有检测到 setLanguage 方法，不能宣称海外动态语言切换通过。北京对照保留现有国内行为，不宣称国内英文底图已启用。

费用：未开通/购买高级服务，未绑定信用卡。无法从公开文档确认本账号海外授权免费，也无法读取账单证明每次请求金额。不得把国内地图可用等同于海外详细地图免费可用。

官方依据：
- https://lbs.amap.com/api/javascript-api-v2/guide/map/world-map
- https://lbs.amap.com/api/javascript-api-v2/guide/map/englishmap
- https://lbs.amap.com/pages/base_service_price

## 最接近现有国内地图的免费候选

原生 MapLibre GL JS + OpenFreeMap Liberty 矢量样式：保留官方完整道路分级、道路名称、建筑、绿地、水域、POI/交通图层，不做整体去色、不隐藏全部地名。原生矢量 source/layer 承载路线示意，DOM 编号 Marker + Popup 承载景点。

候选页已经真实加载巴黎、东京、开罗，支持中文/英文文本表达式切换；每个地名按语言字段优先、缺失回退 name。路线仍是景点间直线，未接入真实道路路由。候选仍是隔离评估，没有替换生产页面。

固定 zoom 13 视野中，对已渲染的非空 name 去重后抽样（不是整个城市统计）：
- 巴黎中文字段 39/52。
- 东京中文字段 16/116。
- 开罗中文字段 4/66。
- 英文视野中的样本均有英文候选字段，但字段存在不保证译名质量，部分字段可能只是转写或复制原名。

例如巴黎 Rue de la Convention / Rue de Vaugirard 缺少中文字段；东京部分填海区域名保留日文；开罗大量城区与街道保留阿拉伯文。开罗截图中的 Cairo/开罗、Nile/尼罗河可切换，不能因此宣称整张地图已中文化。数据自身也可能含不一致译名。

OpenFreeMap 公开实例不要求账号、Key 或信用卡。免费公网服务无本项目可承诺的 SLA；实测有一次新页面加载超时，已有成功截图不能掩盖网络不稳定。
- https://openfreemap.org/
- https://openfreemap.org/quick_start/
- https://maplibre.org/maplibre-gl-js/docs/examples/language-switch/

## 文件与截图

- tests/live/amap-overseas.mjs：现有 Key 海外/国内对照；无密钥日志。
- tests/live/world-map-candidate.mjs：原生 MapLibre 候选方案独立实测。
- reports/amap-overseas/：四城截图和结果。Beijing.json 为国内普通参数的最终对照；results.json 中北京项是海外扩展参数的早期对照，不应视为正常国内效果。
- reports/world-map-candidate/：三城中文/英文截图及语言字段统计。

结论：当前不统一高德。建议保留国内高德，国外选择原生 MapLibre + Liberty 完整矢量样式；正式迁移时需继续验证视野保持、异步城市切换防串位、多日切换、卡片双向联动和错误降级。免费数据无法保证全球街道全部中文化。
