import { WeatherRecord, type WeatherCondition } from "../models";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import { isDbConnected } from "../db/connect";

// Almaty coordinates
const ALMATY_LAT = 43.2389;
const ALMATY_LON = 76.8897;

export type WeatherSnapshot = {
  timestamp: Date;
  condition: WeatherCondition;
  temperature: number;
  windSpeed: number;
  humidity: number;
  visibility: number;
  source: "openweather" | "mock";
};

let cached: { snapshot: WeatherSnapshot; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function getCurrentWeather(): Promise<WeatherSnapshot> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.snapshot;
  }

  if (!env.OPENWEATHER_API_KEY) {
    const snapshot = makeMockWeather();
    cached = { snapshot, fetchedAt: Date.now() };
    return snapshot;
  }

  try {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("lat", String(ALMATY_LAT));
    url.searchParams.set("lon", String(ALMATY_LON));
    url.searchParams.set("appid", env.OPENWEATHER_API_KEY);
    url.searchParams.set("units", "metric");

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`openweather ${res.status}`);
    const data = (await res.json()) as {
      weather?: { main: string }[];
      main?: { temp: number; humidity: number };
      wind?: { speed: number };
      visibility?: number;
    };
    const snapshot: WeatherSnapshot = {
      timestamp: new Date(),
      condition: mapCondition(data.weather?.[0]?.main ?? "Clear"),
      temperature: data.main?.temp ?? 15,
      windSpeed: data.wind?.speed ?? 0,
      humidity: data.main?.humidity ?? 50,
      visibility: data.visibility ?? 10000,
      source: "openweather",
    };
    cached = { snapshot, fetchedAt: Date.now() };
    return snapshot;
  } catch (err) {
    logger.warn({ err }, "openweather fetch failed — using mock");
    const snapshot = makeMockWeather();
    cached = { snapshot, fetchedAt: Date.now() };
    return snapshot;
  }
}

export async function fetchAndStoreWeather(): Promise<WeatherSnapshot> {
  const snapshot = await getCurrentWeather();
  if (isDbConnected()) {
    await WeatherRecord.create({
      timestamp: snapshot.timestamp,
      temperature: snapshot.temperature,
      condition: snapshot.condition,
      windSpeed: snapshot.windSpeed,
      humidity: snapshot.humidity,
      visibility: snapshot.visibility,
      source: snapshot.source,
    }).catch(() => undefined);
  }
  return snapshot;
}

function makeMockWeather(): WeatherSnapshot {
  const month = new Date().getMonth();
  // Almaty seasonal flavor: snow Dec-Feb, rain Apr-May, clear summer, etc.
  let condition: WeatherCondition = "clear";
  let temperature = 15;
  if (month <= 1 || month === 11) {
    condition = Math.random() < 0.5 ? "snow" : "cloudy";
    temperature = -5 + Math.random() * 6;
  } else if (month >= 3 && month <= 4) {
    condition = Math.random() < 0.3 ? "rain" : "cloudy";
    temperature = 10 + Math.random() * 10;
  } else if (month >= 5 && month <= 7) {
    condition = "clear";
    temperature = 22 + Math.random() * 10;
  } else {
    condition = "clear";
    temperature = 8 + Math.random() * 14;
  }
  return {
    timestamp: new Date(),
    condition,
    temperature: Number(temperature.toFixed(1)),
    windSpeed: Math.random() * 6,
    humidity: 40 + Math.random() * 40,
    visibility: 8000 + Math.random() * 2000,
    source: "mock",
  };
}

function mapCondition(main: string): WeatherCondition {
  const m = main.toLowerCase();
  if (m.includes("rain") || m.includes("drizzle")) return "rain";
  if (m.includes("snow")) return "snow";
  if (m.includes("fog") || m.includes("mist") || m.includes("haze")) return "fog";
  if (m.includes("thunder") || m.includes("storm")) return "storm";
  if (m.includes("cloud")) return "cloudy";
  return "clear";
}
