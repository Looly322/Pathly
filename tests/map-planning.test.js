import test from "node:test";
import assert from "node:assert/strict";
import {
  hasValidCoordinates,
  haversineDistance,
  totalStraightDistance,
} from "../src/utils/geo.js";
import { optimizePlaceOrder } from "../src/utils/routeOptimizer.js";
import { normalizePoi } from "../src/services/placeService.js";
const p = (id, latitude, longitude, locked = false) => ({
  id,
  latitude,
  longitude,
  locked,
});
test("haversine returns kilometers and handles antipodes and same point", () => {
  assert.ok(
    Math.abs(haversineDistance(p("a", 0, 0), p("b", 0, 1)) - 111.195) < 0.01,
  );
  assert.equal(haversineDistance(p("a", 30, 120), p("b", 30, 120)), 0);
  assert.ok(Number.isFinite(haversineDistance(p("a", 0, 0), p("b", 0, 180))));
});
test("invalid coordinates cannot enter route optimizer", () => {
  for (const a of [
    p("x", NaN, 0),
    p("x", 91, 0),
    p("x", 0, 181),
    p("x", "30", 120),
    p("x", null, 120),
  ]) {
    assert.equal(hasValidCoordinates(a), false);
    assert.throws(() => optimizePlaceOrder([a]), /INVALID_COORDINATES/);
  }
});
test("nearest neighbor keeps first, retains locks, does not mutate input", () => {
  const places = [
    p("first", 0, 0),
    p("far", 0, 3, true),
    p("near", 0, 1),
    p("middle", 0, 2),
  ];
  const snapshot = JSON.stringify(places),
    result = optimizePlaceOrder(places);
  assert.deepEqual(
    result.map((p) => p.id),
    ["first", "near", "middle", "far"],
  );
  assert.equal(result.at(-1).locked, true);
  assert.equal(JSON.stringify(places), snapshot);
  assert.ok(totalStraightDistance(result) < totalStraightDistance(places));
  assert.deepEqual(optimizePlaceOrder([]), []);
  assert.deepEqual(optimizePlaceOrder([places[0]]), [places[0]]);
});
test("POI normalization preserves actual fields, never fabricates ratings or price", () => {
  const poi = normalizePoi(
    {
      id: "B123",
      name: "West Lake",
      address: "Lake Road",
      type: "Scenic area",
      location: { getLat: () => 30.2, getLng: () => 120.1 },
    },
    "杭州",
  );
  assert.equal(poi.source, "amap");
  assert.equal(poi.poiId, "B123");
  assert.equal(poi.latitude, 30.2);
  assert.equal(poi.estimatedStay, 60);
  for (const key of ["rating", "price", "heat", "crowdLevel"])
    assert.equal(key in poi, false);
  assert.equal(
    normalizePoi(
      { id: "bad", name: "bad", location: { lat: 100, lng: 120 } },
      "杭州",
    ),
    null,
  );
  assert.equal(
    normalizePoi(
      { id: "bad", name: "bad", location: { lat: [], lng: "" } },
      "杭州",
    ),
    null,
  );
  assert.equal(
    normalizePoi({ name: "no ID", location: { lat: 30, lng: 120 } }, "杭州"),
    null,
  );
});

import {
  normalizeTransfer,
  normalizeWalking,
} from "../src/services/transportService.js";
test("real transport preserves seconds, fares, station names and route geometry", () => {
  const route = normalizeTransfer({
    time: 1800,
    distance: 2500,
    cost: 3,
    walking_distance: 500,
    segments: [
      {
        transit_mode: "SUBWAY",
        time: 600,
        distance: 2000,
        transit: {
          lines: [{ name: "地铁6号线" }],
          on_station: { name: "南锣鼓巷" },
          off_station: { name: "北海北" },
          path: [
            { lng: 116.4, lat: 39.9 },
            { lng: 116.3, lat: 39.9 },
          ],
        },
      },
    ],
  });
  assert.equal(route.seconds, 1800);
  assert.equal(route.cost, 3);
  assert.equal(route.segments[0].from, "南锣鼓巷");
  assert.equal(route.segments[0].path.length, 2);
  assert.equal(normalizeTransfer({ distance: 200 }), null);
  assert.equal(normalizeWalking({ time: null, distance: 200 }), null);
  const walk = normalizeWalking({
    time: 600,
    distance: 500,
    steps: [
      {
        instruction: "向前步行",
        path: [
          [116, 39],
          [117, 39],
          [null, null],
        ],
      },
    ],
  });
  assert.equal(walk.segments[0].path.length, 2);
  assert.equal(walk.segments[0].steps[0], "向前步行");
});

import {
  isDemoPlace,
  selectExactPoi,
} from "../src/services/itineraryMapService.js";
test("itinerary map never plots demo places or picks ambiguous search results", () => {
  assert.equal(isDemoPlace({ name: "北京书店（演示）" }), true);
  assert.equal(isDemoPlace({ name: "北京", demo: true }), true);
  assert.equal(isDemoPlace({ name: "景山公园" }), false);
  assert.equal(
    selectExactPoi({ name: "北海公园" }, [{ name: "北海公园北门" }]),
    null,
  );
  assert.equal(
    selectExactPoi({ name: "北海公园" }, [
      { name: "北海公园" },
      { name: "北海公园" },
    ]),
    null,
  );
  assert.equal(
    selectExactPoi({ name: "故宫" }, [{ name: "故宫博物院", id: "real" }]).id,
    "real",
  );
});
