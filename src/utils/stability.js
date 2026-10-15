import { toMinutes } from "./itinerary.js";
export function evaluateStability(itinerary, tripSettings) {
  const n = itinerary.stops.length,
    high = itinerary.stops.filter((s) => s.crowd >= 65).length,
    outdoor = itinerary.stops.filter((s) =>
      ["nature", "night", "oldtown"].includes(s.place.category),
    ).length;
  const available = toMinutes(tripSettings.end) - toMinutes(tripSettings.start);
  const reserve = itinerary.buffers + itinerary.free;
  const ratio = itinerary.occupied / Math.max(1, available);
  const score = n
    ? Math.round(
        Math.max(
          0,
          Math.min(
            100,
            94 -
              Math.max(0, n - 3) * 5 -
              high * 4 -
              outdoor * 1.5 -
              itinerary.totalDistance * 1.2 -
              Math.max(0, ratio - 0.75) * 70 +
              Math.min(15, reserve / 10) -
              itinerary.overflow * 0.8,
          ),
        ),
      )
    : 0;
  const reasons = [{ key: "bufferReason", params: { n: reserve } }],
    warnings = [];
  if (itinerary.totalDistance < 8) reasons.push({ key: "compactReason" });
  else warnings.push({ key: "farWarning" });
  if (n >= 5) warnings.push({ key: "manyWarning", params: { n } });
  if (itinerary.stops.some((s) => s.crowd == null))
    warnings.push({ key: "livePlan.stabilityUnknown" });
  if (high) warnings.push({ key: "crowdWarning", params: { n: high } });
  if (outdoor) warnings.push({ key: "outdoorWarning", params: { n: outdoor } });
  if (ratio > 0.9) warnings.push({ key: "tightWarning" });
  return {
    score,
    level:
      score >= 85
        ? "stableGreat"
        : score >= 70
          ? "stableGood"
          : score >= 50
            ? "stableRisk"
            : "stableTight",
    reasons,
    warnings,
  };
}
