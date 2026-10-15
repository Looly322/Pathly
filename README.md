# Pathly

智能旅行决策与动态行程规划平台 · Vue 3 / Vite / JavaScript。

## 当前产品流程

目的地 → 日期与天数 → 同行类型 → 兴趣 → 节奏 → 步行程度 → 每日预算 → 必去地点 → 按天行程。
国内外共用需求表单、Place 模型、规划器和结果页。地图选点用于添加必去约束，不再是独立规划模式。

## 启动

需要 Node.js 22.12+、npm 和 Python 3（后端无第三方 Python 依赖）。

```sh
npm install
npm run dev
```

默认访问 http://localhost:5173 。同时启动 Vite 与本机 127.0.0.1:8787 Python 后端。当前 Mac 也可双击 `start.command`。生产部署需要同源 `/api` 代理；只发布 dist 无法使用全球目的地解析。

```sh
npm run build
npm test
npm run test:global
npm run test:e2e
```

浏览器测试需要开发服务运行与 Chrome。浏览器自动测试使用真实目的地解析及本地真实地点快照，公共地图样式被替换以避免批量访问瓦片。国内高德在可见浏览器实测。旧版分流页面的测试留在 `tests/legacy-browser` 作历史参考，不纳入当前浏览器测试。

## 规划规则

- 统一九类兴趣：历史文化、美食、自然、购物、艺术、城市漫步、娱乐、夜间活动、亲子。
- 兴趣影响国内候选检索、分类、加权评分、类型组合和推荐理由。地点真实分类优先于名称，避免酒店被当作景点。
- 轻松游最多 3 个、均衡游最多 4 个、高效游最多 5 个主要活动。数据、步行、预算和时间不足时减少活动，不为了凑数压缩大型景点或伪造地点。
- 午餐窗口 11:30–13:30，晚餐窗口 17:30–20:30。仅在出游时间与用餐窗口有至少 30 分钟交集时安排。无餐饮候选时为明确的“附近用餐”事件，附 `foodCandidate` 待匹配，不虚构店名。
- 美食兴趣可匹配附近真实餐厅；咖啡不强制安排，最多一天一次。普通用餐、休息不算主要活动。
- 连续游览超过 180 分钟前插入休息；计算活动数量、步行、移动、连续游玩、大型景点和折返疲劳成本。亲子/长辈不缩短默认停留。
- 每个方案内跨天去重。必去点无法安排时明确列出，不隐藏冲突。
- 动态支持停留 ±15 分钟、排序、删除、同类替换、锁定、重新规划及撤销。重新计算当天用餐、交通预留、费用预留、疲劳与稳定性。
- 预算统一为每日人民币预留，未知门票、餐饮和交通仅是标注的预算假设，不是实时票价。交通时间按距离估算；国内可另查已有高德公交/步行路线，海外提供现有外部公交查询链接，不假装内置全球公交服务。
- 中英文与五种预设/自定义主题保留，使用 localStorage 记忆。

## 数据与架构

- `src/providers/destinationResolver.js`：国内高德精确行政区；其他目的地用现有 Open-Meteo/GeoNames + Wikidata 名称解析。无城市硬编码表，同名城市由用户确认。失败可用英文城市名或“城市, 国家”重试。
- `src/providers/placeProvider.js`：AmapPlaceProvider 与 OpenTripMapPlaceProvider。国内继续高德；海外通过本机后端查询 OpenTripMap，按目的地坐标和兴趣取得真实候选，不读取 Foursquare Key、不发 Foursquare 请求。餐饮通过已有 OSM 服务按需补充。
- `src/planner/place.js`：统一 Place、类别、停留假设。未知评分、价格不补造。
- `src/planner/planner.js`：纯算法；不依赖国家、地图 SDK 或 API。筛选 → 兴趣与多样性评分 → 距离聚集/贪心排序 → 用餐/休息 → 疲劳与约束检查 → dailySchedule。
- `src/providers/imageProvider.js` + `ActivityImage.vue`：已有真实图片 → 已有备用图片 URL → 类别插画。插画明确标注非实拍，不调用新图片 API。
- `src/views/HomeView.vue` / `TripResultView.vue`：统一输入与多天输出；`UnifiedTripMap.vue` 封装现有高德和全球地图。

旧 Mock、旧页面与算法文件留作历史参考，但当前 App 不提供演示模式，不使用 Mock POI 生成行程。

## 本轮验证与边界

北京 3 天在高德真实服务验证；东京 4 天、巴黎 4 天、开罗 3 天、纽约 3 天通过现有真实快照验证。记录见 `backend/core-data-validation.json`、`backend/core-plan-validation.json`。`scripts/check-core-data.py` 仅调用现有城市地理编码及本地数据；`scripts/check-core-plans.mjs` 仅运行本地规划器。

东京缺少符合美食/购物的记录，部分城市无餐厅，因此仅预留当地用餐事件并提示缺失兴趣。当前不保证全球任意城市都有 POI；数据不足时明确显示。中文地名受现有地理编码覆盖与网络限制。尚未验证真实营业时间、预约限制和实时汇率；规划时长不是场馆承诺。

## Foursquare 暂停

本轮未接入、未请求 Foursquare，未新增收费 API。旧 `/api/places/search` 返回 410，后端请求层拒绝 Foursquare 域名，当前服务不读取其环境变量。已有私密 `.env` 被 `.gitignore` 排除，不应发布后端目录为静态资源。历史独立验证脚本不属于当前流程，不要在本轮运行。

后续经用户单独授权后，可新增 FoursquarePlaceProvider，实现同一 `search({destination,interests,wishlist}) -> {places,warnings}` 契约，通过后端返回统一 Place；餐饮填充 `foodCandidate`，图片接 ImageProvider。无需改写 planner。本轮没有实现这个 Provider。

## 展示恢复修复

逐日结果页重新复用已有 Wikidata / Wikimedia Commons 本地化接口：异步补充经过名称/别名和坐标核验的中文名与照片，不改变行程和地点坐标。官网链接恢复；卡片、地图标记和外部交通链接共用名称。无可靠中文名时保留原名；底图只能使用源数据包含的中文道路名称。海外公交入口是携带准确坐标和界面语言的外部查询，不是已核验的路线结果。此流程不调用 Foursquare。

### 图片加载与覆盖检查

图片查询按“真实名称/别名 + 坐标”核验，使用既有 Wikidata / Wikimedia Commons，保留作者、许可证与来源。成功结果保存在 `backend/.cache/place-media-v1/`，浏览器也保存已核验图片资料；切换日期不会取消共享请求。并发上限为 2，HTTP 429 会暂停后续查询，不把限流当作“该景点没有照片”。本轮没有接入 Foursquare 或收费图片服务。

运行 `python3 scripts/audit-place-images.py` 检查已有地点，遇到 429 停止。运行 `python3 scripts/audit-place-images.py --cached-only` 只检查已保存的真实资料，不发网络请求。结果写入 `backend/image-coverage-report.json`：`matched` 仅表示照片资料已匹配，并不保证所有用户网络均可加载；`not_cached` 表示本地资料不足，不能据此判断景点没有照片。无图仍明确显示“类别插画 · 非实拍”，不会使用其他景点照片冒充。

### 未覆盖城市的真实地点查询

海外提供方在快照不足或缺少用户兴趣类型时，通过后端 `/api/open-places` 查询 OpenStreetMap Overpass 公共服务，按目的地坐标检索博物馆、历史地标、公园、餐饮及购物。不维护城市白名单，不使用当前位置；地点统一进入原有多日规划器。查询覆盖城市中心附近约 6–8 km，每类最多 35 条，并复用 24 小时缓存。国内仍使用高德。

这是公共开放数据服务，不需要 Key 或付费账户；覆盖不完整且可能超时/限流，不承诺覆盖每个城市的全部景点。数据按 ODbL 署名，官网等字段只保留来源提供的值，不生成评分或实拍图。无候选时不展示空方案、比较和稳定性评分；可以返回需求重试。`backend/osm-validation.json` 是圣保罗的实际响应记录。

### OpenTripMap 正式接入（2026-10-13）

此节替代前述历史快照与照片准入规则。海外默认使用 OpenTripMap，图片异步加载，不因无图排除有价值的地点，不移除已排行程。

- 后端 `backend/.env` 配置 `OPEN_TRIP_MAP_API_KEY`；该文件被 Git 忽略，前端不会取得 Key。复制 `.env.example` 时只填写自己的凭据。
- 前端调用 `/api/otm/places`，后端使用官方 `radius`；城市解析复用 GeoNames/Wikidata，必要时回退官方 `geoname`。详情使用 `xid/{xid}`。本轮没有使用 bbox、Foursquare 或付费接口。
- 城市中心 4 km → 候选不足时 8 km → 最多 15 km。额外查询高价值地点和用户选择的自然类别，去重后最多返回 60 个多类型候选。范围是圆形搜索区域，并非行政边界；8 km 外标记周边游，需主动选为必去点才进入常规排程。
- 内部类别 HISTORY / CULTURE / MUSEUM / NATURE / LANDMARK / ART / CITY_WALK；API 原始 rate 仅作为资料价值信号，不当作游客评分。姓名、坐标、xid、Wikidata/OSM 标识与近距离同名用于校验去重。
- 每天按兴趣/价值选择地理邻近的地点，最近邻和 2-opt 减少折返；保留不同停留时长、用餐、休息、预算与疲劳检查。直线距离和估算步行负担不是实际道路距离；移动时间仅供排程。
- 图片优先 xid 关联的 Commons 图片，再用关联 Wikidata P18、Wikipedia 页面图片。保存作者、许可、来源，无法核验则使用明确标注的类别插画。首次生成不等待图片；外部图片或网络不可用时不会破图。
- POI 缓存 24 小时，xid 原始详情缓存 7 天，图片资料缓存 24 小时；请求去重、详情串行、前端最多 2 个补充任务。上游每次请求间隔至少 1.1 秒，5xx/网络失败最多重试一次，429 冷却退避，401/403不重试。
- 官方公开 Free 方案为非商业用途、5,000 次/天、10 次/秒（https://dev.opentripmap.org/price）。当前本地另设保守的 200 次/UTC 日预算，存在 `backend/.cache/opentripmap/usage.json`，并非账户剩余额度。缓存、日志、环境文件不进入 Git。商业发布前需重新核对许可。

真实验收（需要本地 Key 和网络）：

```sh
python3 backend/check_otm_live.py
node tests/live/otm-itinerary.mjs
```

记录在 `backend/otm-live-results.json`（六城实际响应）和 `backend/otm-browser-results.json`（真实浏览器三天流程）。普通 `npm run test:e2e` 是隔离的 UI 回归，不冒充实时服务验收。全球公共数据仍可能陈旧、缺图或重复别名，无法保证所有城市的全部景点、开放状态和预约信息。

### 游客评价（外部跳转）

行程地点卡片和原有详情弹窗提供中英文「查看游客评价」入口，在新标签页打开 Tripadvisor。现有真实 Provider 携带的 `tripadvisorUrl`、`website` 或 `sourceUrl` 只有通过 HTTPS、平台域名和 `Attraction_Review` 详情路径检查才用于直达；否则以地点原名、目的地城市和国家组成 `/Search?q=...` 查询。URL 检查不能证明地点身份，Provider 必须保证链接确实属于该地点，禁止推测或按名称拼接详情 ID。

当前 Provider 没有提供可核验的游客评分及评论数量，因此统一显示「暂无评分数据」。OpenTripMap `rate` / `quality`、旧演示评分都不会被当成游客评分。此功能不请求 Tripadvisor API，不抓取页面、不接入 Foursquare、不新增收费服务。外部网站的可访问性、搜索结果与登录要求由 Tripadvisor 决定。

回归：`node --test tests/reviews.test.js`；`npm run test:e2e -- tests/browser/reviews.spec.js`。浏览器测试用北京（故宫、天坛）、东京（东京塔、浅草寺）、巴黎（埃菲尔铁塔、卢浮宫）固定地点输入渲染生产结果页及规划器，验证链接、新标签页、中英文、三天切换和修改/撤销；地图及外部响应在测试中隔离，不代表验证第三方实时可用性。

### 国外地图样式与语言

继续使用 Leaflet + 已有 MapLibre GL Leaflet 插件渲染 OpenFreeMap 矢量底图，采用 Positron 浅色样式并调整公园、水域、建筑配色；没有新增依赖、Key 或收费地图服务。中文/英文切换只更新矢量文字层，不重建地图，不重置中心与缩放。每个标签优先显示所选语言，缺失或空译名回退当地名称；没有翻译 API，不保证所有道路都有中文名。次要道路及小行政区标注在较高缩放级别显示。

景点使用 28px 圆形编号，点击后显示名称弹窗并联动列表。仅选中景点高亮，不常驻全部名称标签。国外虚线为坐标之间的「路线示意」，未请求道路规划，不代表实际步行/驾车路线；国内高德组件与路线能力保持原样。

`tests/mapStyle.test.js` 验证语言回退、MapLibre 表达式和标注密度。`tests/browser/maps.spec.js` 使用巴黎、东京、开罗、北京的真实坐标固定输入加载真实底图，检查语言、视野保持、标记、列表联动与路线示意；该测试依赖外部地图网络可用性。


## 真实天气（Open-Meteo）

结果页天气模块独立异步请求同源 `/api/weather?latitude=…&longitude=…`，后端使用官方 `https://api.open-meteo.com/v1/forecast`。无需 Key 或信用卡。`timezone=auto`，最多请求当前当地日期起 16 天预报；按 API 返回的日期字符串与行程日期精确匹配。过去或超范围日期显示“暂无可靠天气预报”，不使用历史/气候数据替代。

字段：`current=temperature_2m,weather_code,wind_speed_10m`；`daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`；单位 °C、km/h。当前天气是模型估算，并非现场仪器观测。目的地来自高德 GCJ-02 时，仅为天气查询近似转换到 WGS84，不修改地图坐标。

前后端 10 分钟缓存，前端请求去重与 11 秒截止，后端网络超时 8 秒、锁等待最多 1 秒，无自动重试；失败可手动重试。后台保守限制每分钟 30 次、滚动 24 小时 900 次，429 后冷却 60 秒。不影响规划器，雨/高温提醒不自动调整行程。组件显示来源时间；持续停留页面不会自动轮询，切换日期/目的地会检查缓存有效期。

官方免费服务仅限非商业用途，限额低于 600 次/分钟、5,000 次/小时、10,000 次/天；来源署名遵循 CC BY 4.0。未来商业化需重新确认许可，本次未购买服务。官方条件：https://open-meteo.com/en/terms ，字段说明：https://open-meteo.com/en/docs 。

真实四城测试：`python3 tests/live/weather.py`；天气 UI 实测：`node tests/live/weather-ui.mjs`。报告 `reports/weather-module.md`。

### 天气驱动的行程建议

结果页复用 Open-Meteo 逐小时预报评估游览时段的降雨、高温和强风风险。点击“根据天气优化”查看同日换序或有条件的跨天交换；确认后才应用，支持撤销。锁定地点的日期、时间和顺序受到保护。缺失天气不执行优化；缺失开放时间不假定全天开放，详见 [天气优化验收报告](reports/weather-optimization.md)。该功能不新增付费服务，也不将天气预报当作确定事实。
