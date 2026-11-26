import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) =>
  errors.push(e.message.replace(/[a-f0-9]{32}/gi, "[redacted]")),
);
try {
  await page.goto("http://localhost:5173");
  // 保留真实 SDK 和网络，仅暴露地图实例，以稳定重放高德热点事件。
  await page.evaluate(async () => {
    const { loadAmap } = await import("/src/services/amapService.js");
    const A = await loadAmap();
    const Original = A.Map;
    A.Map = class extends Original {
      constructor(...args) {
        super(...args);
        window.__liveMap = this;
      }
    };
  });
  await page
    .getByPlaceholder("搜索城市，例如：杭州 / 北京 / 成都")
    .fill("北京");
  await page.getByRole("button", { name: /我自己在地图上选/ }).click();
  await expect(page.getByText("已定位：北京市", { exact: true })).toBeVisible({
    timeout: 45000,
  });
  const poi = await page.evaluate(async () => {
    const { searchPlaces } = await import("/src/services/placeService.js");
    return (await searchPlaces("北京", "南锣鼓巷"))[0];
  });
  await page.evaluate(
    (p) =>
      window.__liveMap.emit("hotspotclick", {
        id: p.poiId,
        name: p.name,
        lnglat: new window.AMap.LngLat(p.longitude, p.latitude),
      }),
    poi,
  );
  await expect(page.locator(".map-place-popup h3")).toHaveText(poi.name, {
    timeout: 30000,
  });
  await page
    .locator(".map-place-popup")
    .getByRole("button", { name: "加入行程", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "搜索地点", exact: true })
    .fill("北海公园");
  await page.getByRole("button", { name: "搜索地点", exact: true }).click();
  await expect(page.locator(".poi-result").first()).toBeVisible({
    timeout: 30000,
  });
  await page
    .locator(".poi-result")
    .first()
    .getByRole("button", { name: "加入行程", exact: true })
    .click();
  await page.getByRole("button", { name: /帮我规划这些地点/ }).click();
  await expect(page.locator(".transport-leg")).toHaveCount(1, {
    timeout: 60000,
  });
  await expect(page.locator(".transport-options button").first()).toBeVisible({
    timeout: 60000,
  });
  await expect(page.locator(".route-summary-data")).toBeVisible();
  console.log(
    "真实交通方案:",
    await page.locator(".transport-options").innerText(),
  );
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/transport-desktop.png",
    fullPage: true,
  });
  await page.locator(".transport-options button").last().click();
  await expect(page.locator(".transport-segments")).toContainText("步行");
  await page.locator(".transport-modes button").nth(1).click();
  await expect(page.locator(".transport-leg")).toHaveCount(1, {
    timeout: 60000,
  });
  await expect(page.locator(".transport-options button").first()).toBeVisible({
    timeout: 60000,
  });
  console.log(
    "公交优先方案:",
    await page.locator(".transport-options").innerText(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const frame = document
          .querySelector(".amap-container")
          .getBoundingClientRect();
        return [...document.querySelectorAll(".pathly-map-marker")].every(
          (el) => {
            const r = el.getBoundingClientRect();
            return (
              r.left >= frame.left &&
              r.right <= frame.right &&
              r.top >= frame.top &&
              r.bottom <= frame.bottom
            );
          },
        );
      }),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/transport-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator(".transport-routes h2")).toHaveText(
    "Transport routes & travel times",
  );
  expect(await page.locator(".transport-routes").innerText()).not.toMatch(
    /commute\./,
  );
  const lookup = await page.evaluate(async () => {
    const { identifyMapPoint } = await import("/src/services/placeService.js");
    const r = await identifyMapPoint(
      { longitude: 116.403, latitude: 39.934 },
      "北京",
    );
    return { address: r.address, names: r.candidates.map((p) => p.name) };
  });
  console.log("真实逆地理识别:", lookup);
  expect(lookup.address.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  console.log(
    "PASS: 真实热点详情、标记名称、公交/地铁/步行查询、方案选择、移动端无溢出。",
  );
} catch (e) {
  console.error(
    e.message
      .replace(/[a-f0-9]{32}/gi, "[redacted]")
      .replace(/https?:\/\/\S+/g, "[url]"),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
