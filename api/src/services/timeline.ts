export type TrafficMode = "history" | "current" | "prediction";

const CURRENT_WINDOW_MS = 15 * 60 * 1000;

export function getTrafficMode(selectedTime: Date, now: Date = new Date()): TrafficMode {
  const diff = selectedTime.getTime() - now.getTime();
  if (Math.abs(diff) <= CURRENT_WINDOW_MS) return "current";
  return diff < 0 ? "history" : "prediction";
}
