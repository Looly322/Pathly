import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
  await page
    .getByPlaceholder("搜索城市，例如：杭州 / 北京 / 成都")
    .fill("北京");
  await page.getByLabel("Data source").selectOption("demo");
  await page.getByRole("button", { name: /生成我的行程/ }).click();
  await expect(page.locator(".result-heading h1")).toContainText("北京");
  await expect(page.getByText("已定位：北京市", { exact: true })).toBeVisible({
    timeout: 45000,
  });
  await expect(
    page.getByText("正在按城市和地点名称匹配真实位置…", { exact: true }),
  ).toHaveCount(0, { timeout: 90000 });
  await expect(page.locator(".pathly-map-marker").first()).toBeVisible({
    timeout: 10000,
  });
  await expect(page.locator("svg.mock-map")).toHaveCount(0);
  if (await page.locator(".match-candidates").count()) {
    await page.locator(".match-candidates").first().locator("summary").click();
    const candidate = page
      .locator(".match-candidates")
      .first()
      .getByRole("button")
      .first();
    const candidateName = await candidate.locator("strong").innerText();
    await candidate.click();
    await expect(
      page.locator(".marker-place-name").filter({ hasText: candidateName }),
    ).toHaveCount(1, { timeout: 60000 });
  }
  console.log(
    "结果页匹配:",
    await page.locator(".result-map-status").innerText(),
  );
  await expect(
    page.getByText("正在查询高德交通路线…", { exact: true }),
  ).toHaveCount(0, { timeout: 90000 });
  const number = (
    await page.locator(".pathly-map-marker").first().getAttribute("aria-label")
  ).split(".")[0];
  await page.locator(".pathly-map-marker").first().click();
  await expect(
    page.locator(".timeline-item").nth(Number(number) - 1),
  ).toHaveClass(/highlighted/);
  await page.getByRole("button", { name: "查看全部地点", exact: true }).click();
  await expect(
    page.getByText("正在查询高德交通路线…", { exact: true }),
  ).toHaveCount(0, { timeout: 90000 });
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/result-real-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
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
    path: "test-results/result-real-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator(".result-map-status")).toContainText(
    "AMap · Matched itinerary places",
  );
  expect(errors).toEqual([]);
  console.log(
    "PASS: 结果页真实高德底图、POI匹配、原始序号联动、演示点排除、真实交通与移动端。",
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
