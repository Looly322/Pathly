// 真实高德验收，不注入测试替身，不输出 Key / 请求 URL。
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
const sanitize = (s) =>
  s.replace(/[a-f0-9]{32}/gi, "[redacted]").replace(/https?:\/\/\S+/g, "[url]");
page.on("pageerror", (e) => errors.push(sanitize(e.message)));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("Failed to load resource"))
    errors.push(sanitize(m.text()));
});
try {
  await page.goto("http://localhost:5173");
  await page
    .getByPlaceholder("搜索城市，例如：杭州 / 北京 / 成都")
    .fill("杭州");
  await page.getByRole("button", { name: /我自己在地图上选/ }).click();
  await expect(page.getByText("已定位：杭州市", { exact: true })).toBeVisible({
    timeout: 45000,
  });
  expect(await page.evaluate(() => Boolean(window.AMap?.Map))).toBe(true);
  for (const [i, keyword] of ["西湖", "灵隐寺", "小河直街"].entries()) {
    await page
      .getByRole("textbox", { name: "搜索地点", exact: true })
      .fill(keyword);
    await page.getByRole("button", { name: "搜索地点", exact: true }).click();
    await expect(page.locator(".poi-result").first()).toBeVisible({
      timeout: 30000,
    });
    const first = page.locator(".poi-result").first();
    console.log("真实 POI:", await first.locator("h3").innerText());
    await first.getByRole("button", { name: "查看", exact: true }).click();
    await expect(page.locator(".map-place-popup")).toBeVisible();
    await page
      .locator(".map-place-popup")
      .getByRole("button", { name: "加入行程", exact: true })
      .click();
    await expect(page.locator(".selected-place")).toHaveCount(i + 1);
    await expect(page.locator(".pathly-map-marker")).toHaveCount(i + 1);
  }
  await page
    .getByRole("button", { name: "添加自定义地点", exact: true })
    .click();
  await page.locator(".amap-container").click({ position: { x: 350, y: 290 } });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("地点名称").fill("日落拍照点");
  await page.getByRole("button", { name: "90 分钟", exact: true }).click();
  await page.getByRole("checkbox", { name: "必去地点", exact: true }).check();
  await page
    .getByRole("button", { name: "保存并加入行程", exact: true })
    .click();
  await expect(page.locator(".selected-place")).toHaveCount(4);
  await expect(page.locator(".pathly-map-marker")).toHaveCount(4);
  await expect(
    page
      .locator(".selected-place")
      .filter({ hasText: "日落拍照点" })
      .getByRole("button", { name: "删除", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "帮我规划这些地点", exact: false })
    .click();
  await expect(page.locator(".transport-leg")).toHaveCount(3, {timeout:90000});
  await expect(page.locator(".route-summary-data strong").last()).not.toHaveText(
    "0.00 km",
  );
  const original = await page
    .locator(".selected-place strong")
    .allTextContents();
  await page
    .locator(".selected-place")
    .nth(1)
    .getByRole("button", { name: "下移", exact: true })
    .click();
  expect(
    await page.locator(".selected-place strong").allTextContents(),
  ).not.toEqual(original);
  await page.getByRole("button", { name: "查看全部地点", exact: true }).click();
  await page.getByRole("button", { name: /主题/ }).click();
  await page.getByRole("button", { name: "Ocean", exact: false }).click();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.waitForTimeout(800);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/amap-live-desktop.png",
    fullPage: true,
  });
  await page
    .locator(".selected-place")
    .filter({ hasText: "灵隐寺" })
    .locator(".selected-place-main")
    .click();
  await expect(page.locator(".map-place-popup h3")).toContainText("灵隐寺");
  await page
    .locator(".selected-place")
    .filter({ hasText: "灵隐寺" })
    .getByRole("button", { name: "删除", exact: true })
    .click();
  await expect(page.locator(".pathly-map-marker")).toHaveCount(3);
  await expect(page.locator(".map-place-popup")).toHaveCount(0);
  await page.locator(".pathly-map-marker").first().click();
  await expect(page.locator(".selected-place").first()).toHaveClass(/active/);
  await page.getByLabel("目的地城市").fill("成都");
  await page.getByRole("button", { name: "定位城市", exact: true }).click();
  await expect(page.getByText("已定位：成都市", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator(".selected-place")).toHaveCount(0);
  await page.getByLabel("目的地城市").fill("杭州");
  await page.getByRole("button", { name: "定位城市", exact: true }).click();
  await expect(page.getByText("已定位：杭州市", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator(".selected-place")).toHaveCount(3);
  await page
    .getByRole("button", { name: "帮我规划这些地点", exact: false })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  const frame = await page.locator(".amap-container").boundingBox();
  for (const marker of await page.locator(".pathly-map-marker").all()) {
    const box = await marker.boundingBox();
    expect(box.x + box.width).toBeGreaterThan(frame.x);
    expect(box.x).toBeLessThan(frame.x + frame.width);
    expect(box.y + box.height).toBeGreaterThan(frame.y);
    expect(box.y).toBeLessThan(frame.y + frame.height);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await page.locator(".amap-container").boundingBox()).height,
  ).toBeGreaterThan(300);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Plan these places/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/amap-live-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Back to preferences/ }).click();
  await expect(
    page.getByRole("button", { name: /Create my itinerary/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    "PASS: 真实地图、杭州/成都定位、3 次真实 POI 搜索、4 个 Marker、自定义必去点、排序、真实交通路线、删除、联动、主题、英文、移动端和页面返回。",
  );
} catch (error) {
  console.error(sanitize(error.message));
  process.exitCode = 1;
} finally {
  await browser.close();
}
