import { RoadSegment } from "../models";

type CachedRoad = {
  _id: unknown;
  name: string;
  district: string;
  roadType: "main" | "secondary" | "highway";
  coordinates: number[][];
};

let cache: { roads: CachedRoad[]; fetchedAt: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function getCachedRoads(): Promise<CachedRoad[]> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.roads;
  }
  const roads = (await RoadSegment.find()
    .select("name district roadType coordinates")
    .lean()) as unknown as CachedRoad[];
  cache = { roads, fetchedAt: Date.now() };
  return roads;
}

export function invalidateRoadCache(): void {
  cache = null;
}
