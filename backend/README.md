# Pathly 数据后端

Python 3 标准库服务，`npm run dev` 同时启动后端 127.0.0.1:8787 和 Vite 5173。Vite 同源代理 `/api`。

## OpenTripMap

`settings.py` 读取本目录私密 `.env` 的 `OPEN_TRIP_MAP_API_KEY`，环境变量优先。不要把 backend 作为静态目录发布。`.env`、缓存和日志已加入 `.gitignore`。

- `/api/destinations/search?q=开罗`：现有 GeoNames/Wikidata；无结果时回退 OTM geoname。
- `/api/otm/places?latitude=...&longitude=...&city=...&interests=CULTURE,NATURE`：radius 分级搜索、类别映射、质量筛选与去重。
- `/api/otm/details?xid=...`：xid 详情，关联 Commons/Wikidata/Wikipedia 图片与署名。
- `/api/open-places`：保留既有 OSM 公共数据能力，按需补餐饮。
- `/api/current-places`：历史真实数据快照，仅供旧流程与测试使用。

国内前端继续使用既有高德 JS API。OTM Key 从不发送给浏览器。官方主机与接口白名单固定，异常响应不回显带密钥 URL。缓存参数哈希不含 Key。

缓存、限速、额度、图片边界详见根 README 的 OpenTripMap 一节。不会对数百候选立即请求详情；当前日行程的图片/资料按需异步加载。

## 禁用 Foursquare

旧 `/api/places/search` 返回 410 / PROVIDER_DISABLED；本轮不调用其接口或使用其 Key。不执行历史 Foursquare 验证脚本。

## 验证

`npm run test:global` 是隔离单元测试；`python3 backend/check_otm_live.py` 调用真实 OTM 并保存脱敏报告。前端启动后 `node tests/live/otm-itinerary.mjs` 实际运行六城统一规划流程。真实数据可能随上游更新，失败不会替换为 Mock。
