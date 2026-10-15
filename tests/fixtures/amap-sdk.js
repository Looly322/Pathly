// 仅由 Playwright 的网络拦截注入。生产代码不会导入此文件。
export const fixtureState = { maps: [], lines: [], queries: [] };
window.__amapFixture = fixtureState;
class Events {
  constructor() {
    this.handlers = {};
  }
  on(event, callback) {
    (this.handlers[event] ||= []).push(callback);
  }
  emit(event, payload) {
    this.handlers[event]?.forEach((fn) => fn(payload));
  }
}
class FakeMap extends Events {
  constructor(el, options) {
    super();
    this.el = el;
    this.options = options;
    this.center = options.center;
    this.zoom = options.zoom;
    this.el.classList.add("fixture-map");
    this.el.style.background = "#e8ede8";
    this.el.addEventListener("click", (e) => {
      if (e.target.closest(".pathly-map-marker")) return;
      this.emit("click", {
        lnglat: { getLng: () => 120.12, getLat: () => 30.24 },
      });
    });
    fixtureState.maps.push(this);
    setTimeout(() => this.emit("complete"), 10);
  }
  addControl() {}
  resize() {}
  setZoomAndCenter(zoom, center) {
    this.zoom = zoom;
    this.center = center;
  }
  setDefaultCursor(value) {
    this.el.style.cursor = value;
  }
  setFitView() {
    this.fitted = true;
  }
  destroy() {
    this.destroyed = true;
    this.el.replaceChildren();
  }
}
class Marker extends Events {
  constructor(options) {
    super();
    this.options = options;
    this.wrapper = document.createElement("div");
    this.wrapper.style.cssText = "display:inline-block;margin:18px";
    this.wrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      this.emit("click");
    });
    this.setContent(options.content);
  }
  setMap(map) {
    this.map = map;
    if (map) map.el.append(this.wrapper);
    else this.wrapper.remove();
  }
  setContent(content) {
    this.wrapper.replaceChildren(content);
  }
  setPosition(position) {
    this.options.position = position;
  }
  setzIndex() {}
}
class Polyline {
  constructor(options) {
    this.options = options;
    fixtureState.lines.push(this);
  }
  setPath(path) {
    this.options.path = path;
  }
  setOptions(options) {
    Object.assign(this.options, options);
  }
  setMap(map) {
    this.map = map;
  }
}
class DistrictSearch {
  search(city, callback) {
    const delay = city === "慢城市" ? 250 : 5;
    setTimeout(() => {
      if (city === "不存在城市") return callback("no_data", {});
      callback("complete", {
        districtList: [
          {
            name: city,
            level: "city",
            adcode:
              {
                成都: "510100",
                南京: "320100",
                长沙: "430100",
                玄武区: "320102",
              }[city] || "330100",
            center: {
              lng: city === "成都" ? 104.06 : 120.15,
              lat: city === "成都" ? 30.66 : 30.25,
            },
          },
        ],
      });
    }, delay);
  }
}
class PlaceSearch {
  constructor(options) {
    this.options = options;
  }
  getDetails(id, callback) {
    this.search(id, callback);
  }
  search(keyword, callback) {
    fixtureState.queries.push({ keyword, ...this.options });
    const delay = keyword === "慢结果" ? 250 : 5;
    setTimeout(() => {
      if (this.options.type) {
        if (fixtureState.failDiscovery) return callback("error", {});
        if (fixtureState.emptyDiscovery) return callback("no_data", {});
        return callback("complete", {
          poiList: {
            pois: Array.from({ length: keyword ? 3 : 8 }, (_, i) => ({
              id: `national-${this.options.city}-${keyword}-${i}`,
              name: `${keyword || "公园"}真实地点${i + 1}`,
              address: "真实地点测试地址",
              type:
                keyword === "咖啡" ? "餐饮服务;咖啡厅" : "风景名胜;公园广场",
              location: { lng: 120.1 + i * 0.005, lat: 30.25 + i * 0.003 },
            })),
          },
        });
      }
      if (keyword === "无结果") return callback("no_data", {});
      if (keyword === "搜索失败")
        return callback("error", { info: "TEST_ERROR" });
      const coords = {
        西湖: [120.14, 30.25],
        灵隐寺: [120.1, 30.24],
        小河直街: [120.15, 30.31],
      };
      const [lng, lat] = coords[keyword] || [120.16, 30.26];
      callback("complete", {
        poiList: {
          pois: [
            {
              id: keyword,
              name:
                keyword +
                (fixtureState.ambiguous && keyword === "南锣鼓巷"
                  ? "景区"
                  : ""),
              address: "测试地址",
              type: "测试类型",
              location: { lng, lat },
            },
          ],
        },
      });
    }, delay);
  }
}
class Walking {
  search(a, b, cb) {
    setTimeout(
      () =>
        cb("complete", {
          routes: [
            {
              time: 1200,
              distance: 1000,
              steps: [{ instruction: "沿道路步行", path: [a, b] }],
            },
          ],
        }),
      15,
    );
  }
}
class Transfer {
  search(a, b, cb) {
    if (fixtureState.failTransit) return setTimeout(() => cb("error", {}), 15);
    setTimeout(
      () =>
        cb("complete", {
          plans: [
            {
              time: 600,
              distance: 1500,
              cost: 3,
              walking_distance: 200,
              segments: [
                {
                  transit_mode: "SUBWAY",
                  time: 500,
                  distance: 1300,
                  transit: {
                    lines: [{ name: "地铁测试线" }],
                    on_station: { name: "起点站" },
                    off_station: { name: "终点站" },
                    path: [a, b],
                  },
                },
              ],
            },
          ],
        }),
      15,
    );
  }
}
class Geocoder {
  getAddress(point, cb) {
    setTimeout(
      () =>
        cb("complete", {
          regeocode: {
            formattedAddress: "测试地址",
            pois: [
              {
                id: "nearby",
                name: "附近咖啡馆",
                distance: 20,
                location: { lng: point[0], lat: point[1] },
              },
            ],
          },
        }),
      10,
    );
  }
}
export const AMap = {
  Map: FakeMap,
  Marker,
  Polyline,
  DistrictSearch,
  PlaceSearch,
  Walking,
  Transfer,
  Geocoder,
  TransferPolicy: { NO_SUBWAY: 5, LEAST_TIME: 0 },
  Scale: class {},
  ToolBar: class {},
};
export function isAmapConfigured() {
  return true;
}
export async function loadAmap() {
  return AMap;
}
export function withTimeout(promise) {
  return promise;
}
