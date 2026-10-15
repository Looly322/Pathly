import { test, expect } from "@playwright/test";
test("English core UI, 320px home, all theme presets and runtime console", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource"))
      errors.push(m.text());
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".header-brand .brand")).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByRole("button", { name: /Theme/ }).click();
  for (const theme of ["Grape", "Ocean", "Forest", "Sunset", "Rose"]) {
    await page.getByRole("button", { name: new RegExp("^" + theme) }).click();
    expect(
      await page.evaluate(() => localStorage.getItem("pathly-theme")),
    ).toBe(theme);
  }
  await page.getByRole("button", { name: "Close", exact: true }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".header-brand .brand")).toBeVisible();
  }
  await page
    .getByPlaceholder("Search a destination, e.g. Hangzhou, Beijing, Chengdu")
    .fill("Chengdu");
  await page.getByLabel("Data source").selectOption("demo");
  await page.getByRole("button", { name: /Create my itinerary/ }).click();
  await expect(page.locator(".result-heading h1")).toContainText("Chengdu");
  expect(await page.locator("main").innerText()).not.toMatch(
    /[\u4e00-\u9fff]/u,
  );
  await page.locator(".place-main").first().click();
  expect(await page.getByRole("dialog").innerText()).not.toMatch(
    /[\u4e00-\u9fff]/u,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Compare plans/ }).click();
  expect(await page.getByRole("dialog").innerText()).not.toMatch(
    /[\u4e00-\u9fff]/u,
  );
  expect(errors).toEqual([]);
});
