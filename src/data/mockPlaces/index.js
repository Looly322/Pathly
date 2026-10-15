import { placePlanningProfiles } from "../placePlanningProfiles.js";
import hangzhou from "./hangzhou.js";
import beijing from "./beijing.js";
import shanghai from "./shanghai.js";
import suzhou from "./suzhou.js";
import chengdu from "./chengdu.js";
export const cityData = Object.fromEntries(
  Object.entries({ hangzhou, beijing, shanghai, suzhou, chengdu }).map(
    ([city, places]) => [
      city,
      places.map((p) => ({ ...p, ...placePlanningProfiles[p.id] })),
    ],
  ),
);
export const cityNames = {
  hangzhou: { zh: "杭州", en: "Hangzhou" },
  beijing: { zh: "北京", en: "Beijing" },
  shanghai: { zh: "上海", en: "Shanghai" },
  suzhou: { zh: "苏州", en: "Suzhou" },
  chengdu: { zh: "成都", en: "Chengdu" },
};
export function createDemoPlaces(city) {
  return [
    "nature",
    "oldtown",
    "museum",
    "coffee",
    "reading",
    "food",
    "night",
    "culture",
  ].map((category, i) => ({
    id: `demo-${i}`,
    city,
    name: `Demo ${i + 1}`,
    nameEn: `Demo ${i + 1}`,
    demo: true,
    demoIndex: i + 1,
    category,
    image: "",
    rating: 4.2 + (i % 4) * 0.2,
    heat: 30 + i * 7,
    crowdLevel: ["low", "medium", "high"][i % 3],
    estimatedStay: 50 + (i % 3) * 15,
    openingHours: "08:00–22:00",
    tags: [category, "photo", ...(i % 2 ? ["hidden"] : [])],
    latitude: 0 + (i % 3) * 0.012,
    longitude: 0 + Math.floor(i / 3) * 0.013,
    price: (i % 3) * 20,
    description: "mockDescription",
    source: "mock",
  }));
}
