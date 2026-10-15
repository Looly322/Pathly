# Pathly 天气模块验收 · 2026-10-15

网站：http://localhost:5173/ 。本次只增加天气代理、结果页独立天气组件与测试；地图、图片、翻译、Tripadvisor、核心规划算法未修改。

## 修改文件

- `backend/weather.py`：官方预报 API 代理，坐标校验，10 分钟独立持久缓存、并发去重、限流和超时。
- `backend/server.py`：新增 `/api/weather` 路由。
- `src/services/weatherService.js`：替换原未使用的 mock 占位；真实异步获取、内存缓存/去重、按目的地日期匹配、WMO 天气码与提醒；天气专用 GCJ-02 → WGS84 近似转换。
- `src/components/WeatherPanel.vue`：紧凑的当前天气和每日预报；独立加载、失败重试、版本号防止过期响应覆盖；窄屏内部滚动。
- `src/views/TripResultView.vue`：仅 import 和插入天气组件，将目的地和现有行程日期传入。
- `src/i18n/weatherZh.js`、`src/i18n/weatherEn.js`，以及 `src/i18n/zh.js`、`src/i18n/en.js` 的字典注册。
- `tests/weather.test.js`、`backend/test_weather.py`、`tests/browser/weather.spec.js`、`tests/live/weather.py`、`tests/live/weather-ui.mjs`。
- `README.md`：天气启动、限制和测试说明。

## 接口和字段

官方 `GET https://api.open-meteo.com/v1/forecast`，前端仅调用本地 `/api/weather`。

- `latitude`、`longitude`：选中的目的地坐标，不读取用户 IP 或设备位置。
- `timezone=auto`、`forecast_days=16`。
- `current=temperature_2m,weather_code,wind_speed_10m`。
- `daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`。
- `temperature_unit=celsius`、`wind_speed_unit=kmh`。
- 使用返回的 `timezone` 和 `current.time` 显示当地时间；`daily.time` 日期字符串精确匹配每个行程日期，不将 UTC 日期或数组顺序当行程日期。
- 不请求 archive、past_days、历史或气候接口；过去和窗口外日期显示“暂无可靠天气预报”。天气概率、温度缺失显示“—”，不转为 0。
- 降水概率 ≥60% 或雨/雷暴天气码显示雨具提醒；最高温 ≥35°C 显示补水避暑提醒。这些是产品提示，不是官方灾害预警，也不改动行程。

## 四城真实测试

均实际调用本地代理和官方 API，完整响应保存在 `reports/weather/城市.json`。下面是接口当时的模型数据，不代表阅读报告时的最新天气。UI 温度和风速按整数显示。

| 城市 | 请求经纬度（纬度,经度） | 当地时区 | 来源时间 | 气温 | 天气码 | 风速 km/h | 预报日期 |
|---|---|---|---|---:|---:|---:|---|
| 北京 | 39.9042,116.4074 | Asia/Shanghai | 2026-10-15 20:15 | 20.2°C | 1 | 5.9 | 10-15 至 10-30，16 天 |
| 巴黎 | 48.8566,2.3522 | Europe/Paris | 2026-10-15 14:15 | 20.5°C | 2 | 8.6 | 同上 |
| 东京 | 35.6762,139.6503 | Asia/Tokyo | 2026-10-15 21:15 | 17.8°C | 1 | 2.3 | 同上 |
| 开罗 | 30.0444,31.2357 | Africa/Cairo | 2026-10-15 15:15 | 28.7°C | 0 | 14.6 | 同上 |

北京首轮网络失败（502 WEATHER_UNAVAILABLE），第二轮 1.691 秒成功。巴黎首轮约 10.311 秒、东京 6.381 秒、开罗 6.852 秒；第二轮缓存分别 5/2/3 毫秒。8 秒 urllib 超时针对网络操作，不是严格整条 DNS/TLS 链路总时限，因此前端另设 11 秒最终截止。

API 返回的天气网格坐标与请求坐标会略有差异，例如北京网格 39.89455,116.35983。这是模型网格点，原始请求坐标另行保留，没有冒充精确现场观测。

四城均使用生产 WeatherPanel 和真实代理响应验证了中文/英文显示及 2099 年旅行日期的范围外提示；截图 `reports/weather/*-zh.png`、`*-en.png`，文本记录 `ui-results.json`。截图中的 2099-01-01 是故意加入的超范围验收日期。

## 自动化与兼容性验证

- 前端单元测试 56 项通过，其中新增天气 4 项：目的地午夜日期、精确日期/过去/范围外、空值、WMO/提醒、坐标、并发缓存。
- 后端测试 21 项通过，其中新增天气 2 项：官方请求字段、缓存命中、无历史参数、无效坐标、超时错误。
- 本轮 14 项浏览器测试通过（原行程 8、评价 3、天气 3），覆盖多日规划、编辑、评价入口、独立加载、11 秒超时、失败重试、晚到的旧城市响应、切换日期、中英文和手机宽度。
- 故障回归使用标明的响应夹具和人为延迟；没有将这些测试值用于生产或声称它们是真实调用结果。
- `npm run dev` 已实际运行；`npm run build` 成功。现有 MapLibre 分包警告仍存在，与天气模块无关。

## 免费条件与未解决限制

官方文档：https://open-meteo.com/en/docs 。免费条件：https://open-meteo.com/en/terms 。免费接口仅用于非商业项目，需署名 CC BY 4.0；不需要 Key、信用卡。本次没有购买或接入付费服务。官方免费限制低于 600 次/分钟、5,000 次/小时、10,000 次/天；本地保守限制 30 次/分钟和滚动 24 小时 900 次，结果缓存 10 分钟，429 冷却 60 秒，无自动重试风暴。未来商业化须重新评估许可。

当前天气本身是天气模型估算，预报不是准确性保证。16 天以外没有可靠预报；部分字段可能缺失或服务超时，此时按要求显示回退。持续停留页面不自动轮询，显示来源时间；日期/城市变化触发缓存有效期检查。短期缓存不是历史天气替代。未发现阻断性功能问题。
