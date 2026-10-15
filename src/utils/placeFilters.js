// 自动规划不再搭配咖啡店；同时识别 Mock 分类和高德返回的名称 / 类型。
export function isCoffeePlace(place) {
  return place.category === "coffee" ||
    /咖啡|coffee|café|\bcafe\b/i.test(`${place.name || ""} ${place.type || ""}`);
}
