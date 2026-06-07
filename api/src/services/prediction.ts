import type { WeatherCondition } from "../models";

type Weather = {
  condition: WeatherCondition;
  temperature: number;
  windSpeed?: number;
  humidity?: number;
  visibility?: number;
} | null;

export type EventLite = {
  impactLevel: number;
  affectedRoads?: unknown[];
};

/** Events that apply to this road. Empty `affectedRoads` on an event = city-wide. */
export function eventsAffectingRoad(roadId: string, events: EventLite[]): EventLite[] {
  return events.filter((ev) => {
    const affected = ev.affectedRoads ?? [];
    if (!Array.isArray(affected) || affected.length === 0) return true;
    return affected.some((id) => String(id) === roadId);
  });
}

type RoadLite = {
  _id: unknown;
  roadType?: "main" | "secondary" | "highway";
  name?: string;
};

const ROAD_TYPE_BASE: Record<string, number> = {
  main: 4.5,
  secondary: 3.5,
  highway: 5.0,
};

export function computeRuleBasedScore(input: {
  roadSegment: RoadLite;
  selectedTime: Date;
  weather: Weather;
  events: EventLite[];
}): number {
  const { roadSegment, selectedTime, weather, events } = input;
  const hour = selectedTime.getHours();
  const day = selectedTime.getDay(); // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6;

  let score = ROAD_TYPE_BASE[roadSegment.roadType ?? "main"] ?? 4;

  // Rush hour
  if (hour >= 8 && hour <= 10) score += 2.0;
  else if (hour >= 17 && hour <= 19) score += 2.5;
  else if (hour >= 12 && hour <= 14) score += 0.8;
  else if (hour >= 0 && hour <= 5) score -= 2.5;

  if (isWeekend) score -= 1.2;

  if (weather) {
    if (weather.condition === "rain") score += 1.5;
    if (weather.condition === "snow") score += 2.5;
    if (weather.condition === "storm") score += 2.0;
    if (weather.condition === "fog") score += 1.0;
    if (weather.temperature !== undefined && weather.temperature < -10) score += 0.7;
    if (weather.windSpeed !== undefined && weather.windSpeed > 10) score += 0.4;
  }

  for (const ev of eventsAffectingRoad(String(roadSegment._id), events)) {
    score += ev.impactLevel * 0.55;
  }

  // Add a small deterministic jitter so neighboring roads don't look identical.
  const jitter = (hashStr(String(roadSegment._id)) % 11) / 10 - 0.5;
  score += jitter;

  return clamp(score, 0, 10);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
