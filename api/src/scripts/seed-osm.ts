/**
 * Pulls real Almaty road geometry from OpenStreetMap via the Overpass API and
 * loads it into MongoDB as RoadSegment documents. Generates 7 days of synthetic
 * hourly traffic history per segment so the analytics + history pages have data.
 *
 * Run:
 *   npm --workspace api run seed:osm
 *
 * Notes:
 * - Filters to highway = motorway/trunk/primary/secondary/tertiary so the map
 *   doesn't choke on residential streets. Roughly 700–1500 segments for Almaty.
 * - Coordinates are downsampled (every Nth point) to keep payloads small.
 * - Synthetic history mirrors the ML model's feature contract (rush-hour
 *   spikes, weekend dampening, road-type baseline).
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../db/connect";
import { RoadSegment, TrafficHistory, Event } from "../models";
import { logger } from "../lib/logger";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
// Almaty bbox: south, west, north, east
const BBOX = [43.13, 76.75, 43.36, 77.05];
const HIGHWAY_TYPES = ["motorway", "trunk", "primary", "secondary", "tertiary"];

const ROAD_TYPE_MAP: Record<string, "main" | "secondary" | "highway"> = {
  motorway: "highway",
  trunk: "highway",
  primary: "main",
  secondary: "main",
  tertiary: "secondary",
};

const ROAD_BASE = { main: 4.5, secondary: 3.5, highway: 5.0 } as const;

type OverpassNode = { lat: number; lon: number };
type OverpassWay = {
  type: "way";
  id: number;
  geometry?: OverpassNode[];
  tags?: Record<string, string>;
};
type OverpassResponse = { elements: OverpassWay[] };

function buildQuery(): string {
  const types = HIGHWAY_TYPES.join("|");
  return `
    [out:json][timeout:90];
    (
      way["highway"~"^(${types})$"](${BBOX.join(",")});
    );
    out geom;
  `;
}

function downsample(points: OverpassNode[], maxPoints = 30): [number, number][] {
  if (points.length <= maxPoints) {
    return points.map((p) => [p.lon, p.lat]);
  }
  const step = Math.ceil(points.length / maxPoints);
  const out: [number, number][] = [];
  for (let i = 0; i < points.length; i += step) out.push([points[i].lon, points[i].lat]);
  // ensure last point is preserved so the polyline reaches the real endpoint
  const last = points[points.length - 1];
  if (out[out.length - 1][0] !== last.lon || out[out.length - 1][1] !== last.lat) {
    out.push([last.lon, last.lat]);
  }
  return out;
}

function pickName(tags: Record<string, string>): string {
  return (
    tags["name:ru"] ||
    tags["name:en"] ||
    tags["name:kk"] ||
    tags["name"] ||
    tags["ref"] ||
    "Безымянная улица"
  );
}

function pickDistrict(_tags: Record<string, string>): string {
  // OSM tags rarely include district directly. Reverse geocoding is overkill
  // for the seed; placeholder is fine — we don't filter by district anywhere
  // critical yet.
  return "Almaty";
}

function syntheticScore(when: Date, roadType: keyof typeof ROAD_BASE): number {
  let score = ROAD_BASE[roadType];
  const hour = when.getHours();
  const dow = when.getDay();
  if (hour >= 8 && hour <= 10) score += 2.0;
  else if (hour >= 17 && hour <= 19) score += 2.5;
  else if (hour <= 5 || hour >= 23) score -= 2.5;
  if (dow === 0 || dow === 6) score -= 1.2;
  score += (Math.random() - 0.5) * 1.4;
  return Math.max(0, Math.min(10, score));
}

async function fetchOverpass(): Promise<OverpassWay[]> {
  logger.info("fetching Almaty road network from Overpass…");
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      "user-agent": "TrafficJam/0.1 (diploma project; almaty)",
    },
    body: `data=${encodeURIComponent(buildQuery())}`,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    throw new Error(`Overpass API ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as OverpassResponse;
  return json.elements.filter(
    (e) => e.type === "way" && Array.isArray(e.geometry) && e.geometry.length >= 2
  );
}

async function main() {
  const ok = await connectDb();
  if (!ok) {
    logger.error("MONGODB_URI not set / unreachable. Aborting seed.");
    process.exit(1);
  }

  const ways = await fetchOverpass();
  logger.info(`Overpass returned ${ways.length} ways`);

  // De-duplicate by name+endpoints so we don't have 5 segments of the same Abay
  const seen = new Set<string>();
  const docs: Array<{
    name: string;
    district: string;
    roadType: "main" | "secondary" | "highway";
    coordinates: [number, number][];
    osmId: number;
  }> = [];

  for (const way of ways) {
    const tags = way.tags ?? {};
    const highway = tags["highway"];
    const roadType = ROAD_TYPE_MAP[highway];
    if (!roadType) continue;

    const coords = downsample(way.geometry!);
    if (coords.length < 2) continue;

    const name = pickName(tags);
    const fp = `${name}|${coords[0].join(",")}|${coords[coords.length - 1].join(",")}`;
    if (seen.has(fp)) continue;
    seen.add(fp);

    docs.push({
      name,
      district: pickDistrict(tags),
      roadType,
      coordinates: coords,
      osmId: way.id,
    });
  }
  logger.info(`prepared ${docs.length} road segments after dedupe`);

  logger.info("clearing existing roads, traffic history, events");
  await Promise.all([
    RoadSegment.deleteMany({}),
    TrafficHistory.deleteMany({}),
    Event.deleteMany({}),
  ]);

  // Insert in chunks so a slow Mongo doesn't block the whole batch
  const CHUNK = 200;
  const inserted: { _id: mongoose.Types.ObjectId; roadType: keyof typeof ROAD_BASE }[] = [];
  for (let i = 0; i < docs.length; i += CHUNK) {
    const slice = docs.slice(i, i + CHUNK);
    const res = await RoadSegment.insertMany(slice, { ordered: false });
    for (const r of res) {
      inserted.push({ _id: r._id as mongoose.Types.ObjectId, roadType: r.roadType });
    }
    logger.info(`inserted ${inserted.length}/${docs.length}`);
  }

  // History — keep light since road count is high. Override with HISTORY_DAYS env.
  const HISTORY_DAYS = Number(process.env.HISTORY_DAYS ?? 3);
  logger.info(`generating ${HISTORY_DAYS} days of hourly synthetic history`);
  const HOURS = HISTORY_DAYS * 24;
  const now = Date.now();
  const histDocs: Array<Record<string, unknown>> = [];
  for (const road of inserted) {
    for (let i = 0; i < HOURS; i++) {
      const when = new Date(now - (HOURS - i) * 3600 * 1000);
      histDocs.push({
        roadSegmentId: road._id,
        trafficScore: Number(syntheticScore(when, road.roadType).toFixed(2)),
        timestamp: when,
        source: "synthetic",
      });
    }
  }
  // bulk insert in chunks
  for (let i = 0; i < histDocs.length; i += 5000) {
    await TrafficHistory.insertMany(histDocs.slice(i, i + 5000), { ordered: false });
  }
  logger.info(`inserted ${histDocs.length} history rows`);

  // One sample event near central Almaty
  const center = inserted.find((r) => r.roadType === "main") ?? inserted[0];
  if (center) {
    await Event.create({
      title: "Lane closure on a major avenue",
      type: "repair",
      affectedRoads: [center._id],
      startTime: new Date(now + 24 * 3600 * 1000),
      endTime: new Date(now + 26 * 3600 * 1000),
      impactLevel: 6,
      description: "Demo event seeded by seed-osm.ts.",
    });
    logger.info("inserted sample event");
  }

  logger.info("seed-osm complete");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "seed-osm failed");
  process.exit(1);
});
