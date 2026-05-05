import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../db/connect";
import { RoadSegment, TrafficHistory, Event } from "../models";
import { logger } from "../lib/logger";

type RoadSeed = {
  name: string;
  district: string;
  roadType: "main" | "secondary" | "highway";
  coordinates: [number, number][];
};

const ROADS: RoadSeed[] = [
  {
    name: "Abay Avenue (центр)",
    district: "Almaly",
    roadType: "main",
    coordinates: [
      [76.85, 43.245],
      [76.92, 43.245],
      [76.97, 43.247],
    ],
  },
  {
    name: "Dostyk Avenue",
    district: "Medeu",
    roadType: "main",
    coordinates: [
      [76.962, 43.2],
      [76.962, 43.235],
      [76.965, 43.27],
    ],
  },
  {
    name: "Al-Farabi Avenue",
    district: "Bostandyk",
    roadType: "highway",
    coordinates: [
      [76.85, 43.215],
      [76.92, 43.21],
      [76.99, 43.205],
    ],
  },
  {
    name: "Raiymbek Avenue",
    district: "Zhetysu",
    roadType: "main",
    coordinates: [
      [76.86, 43.27],
      [76.92, 43.272],
      [76.99, 43.273],
    ],
  },
  {
    name: "Saina Avenue",
    district: "Auezov",
    roadType: "secondary",
    coordinates: [
      [76.86, 43.21],
      [76.86, 43.27],
    ],
  },
  {
    name: "Tole Bi Street",
    district: "Almaly",
    roadType: "main",
    coordinates: [
      [76.87, 43.255],
      [76.93, 43.256],
      [76.98, 43.257],
    ],
  },
  {
    name: "Gagarin Avenue",
    district: "Bostandyk",
    roadType: "secondary",
    coordinates: [
      [76.91, 43.205],
      [76.911, 43.27],
    ],
  },
  {
    name: "Seifullin Avenue",
    district: "Almaly",
    roadType: "secondary",
    coordinates: [
      [76.946, 43.21],
      [76.945, 43.27],
    ],
  },
  {
    name: "Ryskulov Avenue",
    district: "Zhetysu",
    roadType: "highway",
    coordinates: [
      [76.84, 43.288],
      [76.95, 43.286],
      [77.02, 43.285],
    ],
  },
  {
    name: "Sharipov Street",
    district: "Almaly",
    roadType: "secondary",
    coordinates: [
      [76.94, 43.245],
      [76.939, 43.275],
    ],
  },
];

const ROAD_BASE: Record<string, number> = { main: 4.5, secondary: 3.5, highway: 5.0 };

function syntheticScore(when: Date, roadType: string): number {
  let score = ROAD_BASE[roadType] ?? 4;
  const hour = when.getHours();
  const dow = when.getDay();
  if (hour >= 8 && hour <= 10) score += 2.0;
  else if (hour >= 17 && hour <= 19) score += 2.5;
  else if (hour <= 5 || hour >= 23) score -= 2.5;
  if (dow === 0 || dow === 6) score -= 1.2;
  // Mild seasonal noise
  score += (Math.random() - 0.5) * 1.5;
  return Math.max(0, Math.min(10, score));
}

async function main() {
  const ok = await connectDb();
  if (!ok) {
    logger.error("MONGODB_URI not set / unreachable. Aborting seed.");
    process.exit(1);
  }

  logger.info("clearing existing roads, traffic history, events");
  await Promise.all([
    RoadSegment.deleteMany({}),
    TrafficHistory.deleteMany({}),
    Event.deleteMany({}),
  ]);

  logger.info(`inserting ${ROADS.length} road segments`);
  const inserted = await RoadSegment.insertMany(ROADS);

  logger.info("generating 14 days of hourly synthetic traffic per road");
  const docs: Array<Record<string, unknown>> = [];
  const now = Date.now();
  const HOURS = 14 * 24;
  for (const road of inserted) {
    for (let i = 0; i < HOURS; i++) {
      const when = new Date(now - (HOURS - i) * 3600 * 1000);
      docs.push({
        roadSegmentId: road._id,
        trafficScore: Number(syntheticScore(when, road.roadType).toFixed(2)),
        averageSpeed: 60 - syntheticScore(when, road.roadType) * 4 + Math.random() * 10,
        timestamp: when,
        source: "synthetic",
      });
    }
  }
  await TrafficHistory.insertMany(docs);
  logger.info(`inserted ${docs.length} traffic history rows`);

  logger.info("inserting one sample event (next-day road repair)");
  await Event.create({
    title: "Plumbing works on Abay",
    type: "repair",
    affectedRoads: [inserted[0]._id],
    startTime: new Date(now + 24 * 3600 * 1000),
    endTime: new Date(now + 26 * 3600 * 1000),
    impactLevel: 6,
    description: "Lane closure for utility repair, expect delays.",
  });

  logger.info("seed complete");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "seed failed");
  process.exit(1);
});
