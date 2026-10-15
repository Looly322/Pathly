import { ref } from "vue";
import zh from "./zh.js";
import en from "./en.js";
const messages = { zh, en };
export const language = ref(
  localStorage.getItem("pathly-language") === "en" ? "en" : "zh",
);
export function t(key, params = {}) {
  let value =
    key.split(".").reduce((o, k) => o?.[k], messages[language.value]) ?? key;
  if (typeof value === "string")
    Object.entries(params).forEach(([k, v]) => {
      value = value.replaceAll(`{${k}}`, v);
    });
  return value;
}
export function setLanguage(value) {
  language.value = value;
  localStorage.setItem("pathly-language", value);
  document.documentElement.lang = value === "zh" ? "zh-CN" : "en";
  document.title = `Pathly · ${t("subtitle")}`;
}
export function placeName(place) {
  return place.demo
    ? t("demoName", {
        category: t(`categories.${place.category}`),
        n: place.demoIndex,
      })
    : language.value === "en"
      ? place.nameEn || place.name
      : place.name;
}
setLanguage(language.value);
