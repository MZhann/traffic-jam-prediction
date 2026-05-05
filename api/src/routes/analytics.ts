import { Router } from "express";
import { TrafficHistory, RoadSegment } from "../models";
import { isDbConnected } from "../db/connect";

export const analyticsRouter = Router();

analyticsRouter.get("/by-hour", async (_req, res) => {
  if (!isDbConnected()) return res.json({ data: [] });
  const data = await TrafficHistory.aggregate<{ _id: number; avg: number; count: number }>([
    {
      $group: {
        _id: { $hour: "$timestamp" },
        avg: { $avg: "$trafficScore" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  res.json({ data: data.map((d) => ({ hour: d._id, avgScore: Number(d.avg.toFixed(2)), count: d.count })) });
});

analyticsRouter.get("/busiest-roads", async (_req, res) => {
  if (!isDbConnected()) return res.json({ data: [] });
  const data = await TrafficHistory.aggregate<{ _id: unknown; avg: number }>([
    {
      $group: {
        _id: "$roadSegmentId",
        avg: { $avg: "$trafficScore" },
      },
    },
    { $sort: { avg: -1 } },
    { $limit: 10 },
  ]);
  const roadIds = data.map((d) => d._id);
  const roads = await RoadSegment.find({ _id: { $in: roadIds } }).lean();
  const byId = new Map(roads.map((r) => [String(r._id), r]));
  res.json({
    data: data.map((d) => ({
      roadSegmentId: String(d._id),
      name: byId.get(String(d._id))?.name ?? "unknown",
      avgScore: Number(d.avg.toFixed(2)),
    })),
  });
});

analyticsRouter.get("/by-weekday", async (_req, res) => {
  if (!isDbConnected()) return res.json({ data: [] });
  const data = await TrafficHistory.aggregate<{ _id: number; avg: number }>([
    {
      $group: {
        _id: { $dayOfWeek: "$timestamp" },
        avg: { $avg: "$trafficScore" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  res.json({
    data: data.map((d) => ({ weekday: labels[d._id - 1], avgScore: Number(d.avg.toFixed(2)) })),
  });
});
