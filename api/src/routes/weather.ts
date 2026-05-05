import { Router } from "express";
import { getCurrentWeather, fetchAndStoreWeather } from "../services/weather";
import { WeatherRecord } from "../models";

export const weatherRouter = Router();

weatherRouter.get("/current", async (_req, res) => {
  const w = await getCurrentWeather();
  res.json({ weather: w });
});

weatherRouter.post("/snapshot", async (_req, res) => {
  const w = await fetchAndStoreWeather();
  res.status(201).json({ weather: w });
});

weatherRouter.get("/history", async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const records = await WeatherRecord.find({ timestamp: { $gte: from, $lte: to } })
    .sort({ timestamp: 1 })
    .lean();
  res.json({ records });
});
