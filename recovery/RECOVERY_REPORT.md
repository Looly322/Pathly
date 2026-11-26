# Pathly 11 月版本恢复记录

恢复日期：2026-11-26（Asia/Shanghai）。恢复目录：`/Users/conths/Documents/ChatGPT/Pathly-final-recovery`。

## 依据与边界

- 找到 **1 条持续开发的 Pathly 会话**：`01a0ebc9-6ae6-74a1-b8d1-7a327f071014`，开始于 9 月 29 日。11 月有实际开发命令的日期为 **11 月 3、10、17 日**，不是 439 个会话。
- 从这条会话提取到 11 月 **439 条命令记录**。最早 11 月 3 日 14:15、最晚 11 月 17 日 15:23（北京时间）；没有把 11 月 26 日的恢复命令当成删除前开发。
- 为恢复 11 月依赖的页面，亦检查了同一 Pathly 会话的 9–10 月代码。共提取 **222 个完整文件写入片段，涉及 204 个不同文件**，另恢复实际工具输出中的组件全文和模板字符串命令。
- 使用原 Git 提交 `7ab04065cd5faa285e43c886b5511dbf2bea100f` 作为基础，衔接后续原始文件与补丁。原备份 `Pathly-recovered` 未覆盖、未删除；只停止了它的开发服务，将同一端口切换到恢复版。
- 这不是删盘数据恢复，也不是整个工作目录的位级备份。部分历史命令是失败尝试或补丁前提不同，回放后依据原代码、测试和浏览器进行了去重、导入接线与兼容修复。不能保证与删除前每一字节相同。
- 原始命令索引只保留在本地 recovery 中，并排除 Git；未从会话提取 API 密钥，也未读取其他项目聊天内容。

## 按实际开发日期梳理

| 日期 | 有代码/执行记录的工作 |
|---|---|
| 9–10 月基础 | Vue 页面与现有 Python 服务；全球地图与搜索；旅行杂志首页、诗词墙、雪山文件夹、书法搜索区域、旅行杂志结果页及图片服务基础 |
| 11 月 3 日 | Commons 图片检索、媒体代理/缓存、城市封面与景点图片展示、结果页地图/天气接线 |
| 11 月 10 日 | 坐标与搜索回退；交通进入排程；开放时间/天气约束；必去地点与去重；15 分钟排程与编辑；酒店/餐厅、本地历史/收藏、统一草稿、游览时长模型 |
| 11 月 17 日 | 主动候选发现与价值评分、多日优化、路线补充与质量评估、景区层级与时长资料；中文名称/图片队列；退出草稿生命周期；用户新视频；标记复用 |

## 恢复方式

**找到了完整原始文件写入/实际源码输出**（不代表每个文件最后版本只需一次写入）：
- 规划：`src/planner/planQuality.js`、`recommendationValue.js`、`routeCandidates.js`、`visitDuration.js`、`visitProfiles.js`、`feasibility.js`、`travel.js`、`improveDays.js` 等。
- 用户状态：`src/state/tripDraft.js`、`src/services/travelLibrary.js`、`src/views/LibraryView.vue`、`PlacePicker.vue`、`FavoriteButton.vue`。
- 图片/名称：`backend/commons_images.py`、`media_delivery.py`、`name_translation.py`、`reference_cache.py`、`src/components/ActivityImage.vue` 等。
- 视觉：HomeView/样式、DestinationGallery、诗词墙、SearchCalligraphy、JourneyCover、TripResultView/样式。文件夹另以实际工具输出全文为可靠基点恢复。

**必须通过原始补丁衔接的主要文件**：`src/App.vue`、`src/views/HomeView.vue`、`src/views/TripResultView.vue`、`src/planner/planner.js`、`src/services/placePresentation.js`、`src/providers/*`、`src/components/GlobalMap.vue`、`MapPlanner.vue`、`backend/server.py`、`opentripmap.py` 等。逐文件快照来源见 `source-manifest.json`；完整变更清单见 `changed-files.txt`。

**本次必要恢复修补，不伪称原始逐字恢复**：清除回放重复导入/属性/函数；恢复丢失的交通、可行性模块导入；将 GlobalMap 回到完整原 Git 实现后应用 11 月标记复用补丁；修复重复替换产生的函数名；生成独立恢复启动脚本和验收脚本。未重新设计页面、未新开发规划算法。

## 素材

- 雪山湖泊：从 **10 月 23 日原用户消息内嵌 JPEG** 恢复，非替代照片。保留会话附件分辨率，不能证明等同于被删桌面原文件的最高分辨率。
- 植物装饰：找回此前生成的原透明 PNG。
- 首页新视频：原文件仍在 `~/Downloads/11月17日.mp4`，按原编码参数重新生成网页 MP4/封面；保留原水印，仅本地使用，未部署公开。
- 摄影素材：按历史原链接下载 **43/44 张**（包括 8 张独立明信片）。`wall-lychee.webp` 原链接 404，未用其他照片冒充；现有组件显示明确缺图状态。
- 书法：同一 Commons 原图，使用恢复的 `scripts/prepare-lanting.py` 再处理透明背景。
- 字体：同一 Source Han Serif 原字库、Cormorant Garamond；按原文本生成子集，保留 OFL 许可。
- 摄影来源/署名保存在 `public/images/home/credits.json`；Commons 景点来源与许可由原服务返回。

## 本轮验证结果（不继承旧报告的“通过”结论）

### 实际通过
- Vue/Vite 正式构建成功。仍存在 MapLibre 大包提示，未为恢复任务擅自重构。
- Python ThreadingHTTPServer 启动，`/api/health` 正常。
- JS **129 项**测试通过；Python **41 项**测试通过；JS 源码未定义标识符扫描为零。自动化中的模拟数据不算实时 API 验收。
- 浏览器首页正常、无启动脚本错误；文件夹默认/展开/收回与 8 张卡片；桌面与 390px 手机无横向溢出。
- 原视频验收脚本通过：13.77 秒、自动播放/静音/循环/内联、移动端与 reduced-motion。
- 原书法验收脚本通过：固定书法、径向显现/移出隐藏、表单输入及 reduced-motion。
- 草稿城市、日期、必去名称填写后刷新保留。
- 巴黎生成三日行程、三屏布局、地图瓦片/编号；日期切换；−15/+15、锁定/解锁；完整历史快照刷新恢复；路线收藏刷新保留；退出清草稿而不清历史收藏。浏览器错误列表为空。
- 巴黎城市封面及部分景点 Commons 实拍实际成功显示；仍有地点缺图/缺中文标签，诚实保留占位/原名。
- `/api/destinations/search?q=Paris` 当前实际返回地点、坐标与国家候选。

### 重要限制
- 巴黎三日行程的 46 个候选来源实际为 **existing-snapshot（项目原真实地点快照）**，不是当前在线 POI 接口的全量成功。此次完整行程见 `reports/planning-upgrade/paris.json`。
- 未恢复 `.env`：原备份无高德配置，且按要求不从历史提取密钥。国内地图、实时高德酒店/餐厅/交通不能宣布通过，需用户自行配置原合法密钥。
- 巴黎 Ritz 酒店在线名称接口实际返回 `UPSTREAM_UNAVAILABLE`。酒店/餐厅统一排程源码和自动化已恢复，但本轮未通过完整在线真实商户验收。
- 海外公交仍按原实现标记估算/示意；没有伪造实时公交。开放时间未知、未来预报超范围仍存在原数据限制。
- 全部景点中文名、图片、营业时间不保证覆盖；原授权要求仍保留。
- 历史记录、收藏、草稿使用原浏览器存储键。未清除用户浏览器数据；独立验收浏览器不等于恢复用户原历史数据。已删除的 SQLite 热缓存未找回，服务会重新建立本恢复目录缓存。
- 保留原有主题选择器，因此全局少量控件仍可能使用原用户主题；没有擅自把所有紫色替换为绿色。首页、表单及结果主体已恢复其原米白/深绿专用样式。

## 启动与保全

当前前端 `http://localhost:5173/`，后端 `http://127.0.0.1:8787/`。这是本机服务，关机或停止进程后需重新启动。

双击项目中的 `启动Pathly.command`，保留终端窗口；或在项目目录运行 `node scripts/dev.mjs`（需可用 Node >=22.12 和 Python3）。当前依赖已安装。Git 仅本地检查点，未推送、未部署。

截图：`reports/recovery/home.png`、`folder-default.png`、`folder-open.png`、`search.png`、`mobile.png`、`result-cover.png`、`result-map.png`、`result-places.png`。

结论：恢复了原始实现为主、经原补丁衔接的可运行 11 月版本；不是仅将旧版换色，也不是承诺所有外部服务与删除前状态完全一致。待补项主要是原高德配置、1 张失效图片及外部服务可用性。
