import { Router } from "express";
import { z } from "zod";
import { Prediction } from "../models";
import { getCachedRoads } from "../services/roads";
import { computeRuleBasedScore } from "../services/prediction";
import { getCurrentWeather } from "../services/weather";
import { getActiveEvents } from "../services/events";
import { callMlService } from "../services/mlClient";
import { logger } from "../lib/logger";

export const predictionsRouter = Router();

const predictSchema = z.object({
  selectedTime: z.string().datetime(),
  weatherEnabled: z.boolean().optional().default(true),
  eventsEnabled: z.boolean().optional().default(true),
  roadSegmentIds: z.array(z.string()).optional(),
  useMl: z.boolean().optional().default(true),
});

predictionsRouter.post("/", async (req, res) => {
  const parsed = predictSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const { selectedTime, weatherEnabled, eventsEnabled, roadSegmentIds, useMl } = parsed.data;
  const time = new Date(selectedTime);

  const allRoads = await getCachedRoads();
  const roads = roadSegmentIds?.length
    ? allRoads.filter((r) => roadSegmentIds.includes(String(r._id)))
    : allRoads;
  const weather = weatherEnabled ? await getCurrentWeather() : null;
  const events = eventsEnabled ? await getActiveEvents(time) : [];

  let mlPredictions: Map<string, { score: number; confidence: number }> | null = null;
  let modelVersion = "rule-based-v1";
  if (useMl) {
    try {
      const ml = await callMlService({
        selectedTime: time.toISOString(),
        weather,
        events: events.map((e) => ({
          impactLevel: e.impactLevel,
          affectedRoads: (e.affectedRoads ?? []).map((id) => String(id)),
        })),
        roads: roads.map((r) => ({
          id: String(r._id),
          name: r.name,
          roadType: r.roadType,
        })),
      });
      mlPredictions = new Map(ml.predictions.map((p) => [p.roadSegmentId, p]));
      modelVersion = ml.modelVersion;
    } catch (err) {
      logger.warn({ err }, "ml service unavailable — falling back to rule-based");
    }
  }

  const items = roads.map((road) => {
    const ml = mlPredictions?.get(String(road._id));
    if (ml) {
      return {
        roadSegmentId: String(road._id),
        name: road.name,
        coordinates: road.coordinates,
        trafficScore: ml.score,
        confidence: ml.confidence,
      };
    }
    return {
      roadSegmentId: String(road._id),
      name: road.name,
      coordinates: road.coordinates,
      trafficScore: computeRuleBasedScore({ roadSegment: road, selectedTime: time, weather, events }),
      confidence: 0.6,
    };
  });

  // best-effort persist (won't fail the request if db is offline)
  Promise.all(
    items.map((item) =>
      Prediction.create({
        roadSegmentId: item.roadSegmentId,
        predictedTrafficScore: item.trafficScore,
        confidence: item.confidence,
        selectedTime: time,
        weatherInput: weather ?? {},
        eventInput: { count: events.length },
        modelVersion,
      }).catch(() => undefined)
    )
  );

  res.json({
    mode: "prediction",
    selectedTime: time.toISOString(),
    modelVersion,
    weather,
    events: events.length,
    roads: items,
  });
});
