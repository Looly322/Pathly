import test from "node:test";
import assert from "node:assert/strict";
import {
  searchPlaces,
  searchPlaceByName,
} from "../src/services/mockPlaceService.js";
import { resolveCity } from "../src/services/cityService.js";
import {
  generatePlanVariants,
  replacePlace,
  calculatePlaceScore,
} from "../src/utils/recommendation.js";
import { schedule } from "../src/utils/itinerary.js";
import { evaluateStability } from "../src/utils/stability.js";
const prefs = {
  selectedCity: "杭州",
  date: "2026-10-01",
  start: "09:00",
  end: "20:00",
  budget: 500,
  interests: ["culture", "coffee", "photo"],
  preferences: ["avoid", "less"],
  walking: "medium",
  wishIds: ["hangzhou-1"],
};
const places = searchPlaces("杭州");
test("arbitrary city resolution never borrows another city’s POIs", () => {
  assert.equal(resolveCity("Hangzhou").key, "hangzhou");
  assert.equal(resolveCity("长沙").supported, false);
  assert.ok(searchPlaces("长沙").every((p) => p.demo && p.city === "长沙"));
  assert.equal(searchPlaceByName("长沙", "西湖"), null);
});
test("three distinct plans satisfy time and budget, prioritize wishlist", () => {
  const plans = generatePlanVariants(places, prefs);
  assert.equal(plans.length, 3);
  assert.equal(
    new Set(
      plans.map((p) =>
        JSON.stringify(p.items.map((s) => [s.place.id, s.duration])),
      ),
    ).size,
    3,
  );
  for (const p of plans) {
    const data = schedule(p.items, prefs, p.buffer);
    assert.equal(data.overflow, 0);
    assert.ok(data.cost <= prefs.budget);
    assert.ok(p.items.some((s) => s.place.id === "hangzhou-1"));
  }
});
test("duration, order and delay change downstream times and route", () => {
  const p = generatePlanVariants(places, prefs)[0];
  const before = schedule(p.items, prefs, p.buffer);
  p.items[0].duration += 30;
  const after = schedule(p.items, prefs, p.buffer);
  assert.equal(after.stops[1].start - before.stops[1].start, 30);
  p.items[0].delay = 15;
  assert.equal(
    schedule(p.items, prefs, p.buffer).stops[1].start - after.stops[1].start,
    15,
  );
  [p.items[0], p.items[1]] = [p.items[1], p.items[0]];
  assert.notEqual(
    schedule(p.items, prefs, p.buffer).stops[0].place.id,
    before.stops[0].place.id,
  );
});
test("locked places survive all variants, even impossible constraints", () => {
  const p = generatePlanVariants(places, prefs)[0];
  const lock = { ...p.items[0], locked: true };
  for (const plan of generatePlanVariants(
    places,
    { ...prefs, budget: 0, end: "09:05" },
    [lock],
  ))
    assert.ok(plan.items.some((s) => s.locked && s.place.id === lock.place.id));
});
test("replacement excludes current and scheduled places", () => {
  const current = places[0];
  const candidates = replacePlace(current, places, {
    ...prefs,
    excludedIds: [places[1].id],
  });
  assert.ok(candidates.length);
  assert.ok(
    candidates.every((p) => p.id !== current.id && p.id !== places[1].id),
  );
});
test("stability reacts to overflow and remains bounded", () => {
  const p = generatePlanVariants(places, prefs)[0];
  const before = evaluateStability(schedule(p.items, prefs, p.buffer), prefs);
  p.items[0].duration += 600;
  const data = schedule(p.items, prefs, p.buffer);
  const after = evaluateStability(data, prefs);
  assert.ok(data.overflow > 0);
  assert.ok(after.score < before.score);
  assert.ok(after.score >= 0 && after.score <= 100);
});
test("zero budget and very short day produce valid empty plan", () => {
  for (const p of generatePlanVariants(places, {
    ...prefs,
    budget: 0,
    end: "09:05",
  }))
    assert.equal(p.items.length, 0);
});
test("every mock city has complete records and no duplicate POIs", () => {
  for (const city of ["北京", "上海", "杭州", "苏州", "成都"]) {
    const ps = searchPlaces(city);
    assert.ok(ps.length >= 6 && ps.length <= 10);
    assert.equal(new Set(ps.map((p) => p.id)).size, ps.length);
    for (const p of ps)
      for (const key of [
        "id",
        "city",
        "name",
        "category",
        "image",
        "rating",
        "heat",
        "crowdLevel",
        "estimatedStay",
        "openingHours",
        "tags",
        "latitude",
        "longitude",
        "price",
        "description",
        "source",
      ])
        assert.ok(key in p);
  }
});
test("interest and wishlist contribute measurable score rewards", () => {
  const p = places[0];
  assert.ok(
    calculatePlaceScore(p, { ...prefs, wishIds: [p.id] }) >
      calculatePlaceScore(p, { ...prefs, wishIds: [] }),
  );
  assert.ok(
    calculatePlaceScore(p, { ...prefs, interests: p.tags }) >
      calculatePlaceScore(p, { ...prefs, interests: [] }),
  );
});
test("night views are never scheduled before the simulated evening window", () => {
  const night = places.find((p) => p.category === "night");
  const data = schedule([{ place: night, duration: 60, delay: 0 }], prefs, 10);
  assert.ok(data.stops[0].start >= 17 * 60);
});
test("advancing consumes buffer without negative travel time", () => {
  const data = schedule(
    [
      { place: places[0], duration: 60, delay: 0 },
      { place: places[1], duration: 60, delay: -100 },
    ],
    prefs,
    10,
  );
  assert.equal(
    data.stops[1].start,
    data.stops[0].end + data.stops[1].route.time,
  );
  assert.ok(data.buffers >= 0);
});

import { analyzeRegion, isAttraction } from "../src/utils/regionPlanning.js";
test("all supported cities: explorer covers more attractions than slow and night never blocks daytime filling", () => {
  for (const city of ["杭州", "北京", "上海", "苏州", "成都"]) {
    const settings = { ...prefs, wishIds: [], selectedCity: city };
    const [explorer, slow, crowd] = generatePlanVariants(
      searchPlaces(city),
      settings,
    );
    const count = (p) => p.items.filter((s) => isAttraction(s.place)).length;
    assert.ok(
      count(explorer) > count(slow),
      city + " attraction counts must differ",
    );
    assert.ok(
      explorer.items.length > slow.items.length,
      city + " total stops must differ",
    );
    assert.ok(
      count(explorer) >= 4,
      city + " daytime attractions should not be dropped by night waiting",
    );
    assert.ok(
      schedule(crowd.items, settings, crowd.buffer).crowding <
        schedule(explorer.items, settings, explorer.buffer).crowding,
    );
    for (const p of [explorer, slow, crowd]) {
      const d = schedule(p.items, settings, p.buffer);
      assert.equal(d.overflow, 0);
      assert.ok(d.cost <= settings.budget);
    }
    assert.ok(schedule(slow.items, settings, slow.buffer).free >= 90);
  }
});
test("regional distribution and visit length change capacity, not just city labels", () => {
  const base = searchPlaces("北京")
    .filter(isAttraction)
    .map((p, i) => ({
      ...p,
      id: "regional-" + i,
      category: "nature",
      latitude: 30 + i * 0.001,
      longitude: 120,
      estimatedStay: 60,
      minimumStay: 45,
      price: 0,
    }));
  const far = base.map((p, i) => ({
    ...p,
    latitude: 30 + i * 0.3,
    estimatedStay: 150,
    minimumStay: 120,
  }));
  const settings = {
    ...prefs,
    wishIds: [],
    start: "09:00",
    end: "16:00",
    budget: 500,
  };
  const compact = generatePlanVariants(base, settings)[0];
  const spread = generatePlanVariants(far, settings)[0];
  assert.ok(compact.items.length > spread.items.length);
  assert.equal(analyzeRegion(far).kind, "spread");
  assert.equal(analyzeRegion(base).kind, "compact");
});
test("landmark minimum stay cannot be squeezed to pad attraction counts", () => {
  const palace = searchPlaces("北京").find((p) => p.id === "beijing-0");
  for (const plan of generatePlanVariants([palace], {
    ...prefs,
    wishIds: [],
    start: "09:00",
    end: "20:00",
  }))
    for (const item of plan.items) assert.ok(item.duration >= 120);
});

import {
  toPlanningPlace,
  isUsefulPoi,
} from "../src/services/destinationPlanningService.js";
test("real POIs keep unknown facts unknown and use labelled budget reserves", () => {
  const real = toPlanningPlace({
    id: "real",
    source: "amap",
    name: "真实公园",
    type: "风景名胜;公园",
    latitude: 32,
    longitude: 118,
    photos: [],
  });
  assert.equal(real.rating, null);
  assert.equal(real.price, null);
  assert.equal(real.crowdLevel, null);
  assert.equal(real.openingHours, null);
  const data = schedule([{ place: real, duration: 90 }], prefs);
  assert.equal(data.crowding, null);
  assert.equal(data.cost, real.costEstimate);
  const plans = generatePlanVariants([real], { ...prefs, wishIds: [] });
  assert.ok(plans.every((p) => p.items.length === 1));
  assert.equal(isUsefulPoi({ ...real, name: "公园售票处" }), false);
});


test("automatic plans and replacements exclude cafes even with legacy coffee preferences", () => {
  const cafe = { ...places[0], id: "cafe", category: "coffee", name: "咖啡店", tags: ["culture", "photo"], estimatedStay: 30, minimumStay: 15, price: 0 };
  const mixed = [...places, cafe];
  for (const city of ["杭州", "北京", "上海", "苏州", "成都", "南京"]) {
    for (const plan of generatePlanVariants([...searchPlaces(city), cafe], { ...prefs, wishIds: [] })) {
      assert.ok(plan.items.every((s) => s.place.category !== "coffee" && !/咖啡/.test(s.place.name)));
    }
  }
  assert.ok(!replacePlace(places[0], mixed, prefs).some((p) => p.id === cafe.id));
  assert.equal(isUsefulPoi({ name: "茉莉咖啡(金星中路店)", type: "餐饮服务" }), false);
  assert.equal(isUsefulPoi({ name: "Corner Cafe", type: "餐饮服务" }), false);
  assert.equal(isUsefulPoi({ name: "橘子洲头", type: "风景名胜" }), true);
});
