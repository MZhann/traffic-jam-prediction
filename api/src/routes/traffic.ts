import { Router } from "express";
import { z } from "zod";
import { TrafficHistory } from "../models";
import { getCachedRoads } from "../services/roads";
import { getTrafficMode } from "../services/timeline";
import { computeRuleBasedScore } from "../services/prediction";
import { getCurrentWeather } from "../services/weather";
import { getActiveEvents } from "../services/events";

export const trafficRouter = Router();

const querySchema = z.object({
  time: z.string().datetime().optional(),
  weatherEnabled: z.coerce.boolean().optional().default(true),
  eventsEnabled: z.coerce.boolean().optional().default(true),
});

trafficRouter.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const selectedTime = parsed.data.time ? new Date(parsed.data.time) : new Date();
  const mode = getTrafficMode(selectedTime);

  const roads = await getCachedRoads();
  const weather = parsed.data.weatherEnabled ? await getCurrentWeather() : null;
  const events = parsed.data.eventsEnabled ? await getActiveEvents(selectedTime) : [];

  // Rule-based scoring for all modes — fast and deterministic. Real historical
  // data lookups live in /api/traffic/road/:id/history and /api/analytics/*
  // where they're scoped to a single road or pre-aggregated.
  const items = roads.map((road) => ({
    roadSegmentId: String(road._id),
    name: road.name,
    coordinates: road.coordinates,
    trafficScore: computeRuleBasedScore({ roadSegment: road, selectedTime, weather, events }),
    source:
      mode === "current"
        ? ("current" as const)
        : mode === "history"
          ? ("history" as const)
          : ("prediction" as const),
  }));

  res.json({
    mode,
    selectedTime: selectedTime.toISOString(),
    weather,
    events,
    roads: items,
  });
});

trafficRouter.get("/road/:id/history", async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const history = await TrafficHistory.find({
    roadSegmentId: req.params.id,
    timestamp: { $gte: from, $lte: to },
  })
    .sort({ timestamp: 1 })
    .lean();
  res.json({ history });
});

trafficRouter.post("/history", async (req, res) => {
  const schema = z.object({
    roadSegmentId: z.string(),
    trafficScore: z.number().min(0).max(10),
    averageSpeed: z.number().optional(),
    timestamp: z.string().datetime(),
    source: z.enum(["dataset", "api", "manual", "synthetic"]).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const created = await TrafficHistory.create({
    ...parsed.data,
    timestamp: new Date(parsed.data.timestamp),
  });
  res.status(201).json({ entry: created });
});
