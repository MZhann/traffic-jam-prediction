import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { logger } from "./lib/logger";
import { isDbConnected } from "./db/connect";
import { authRouter } from "./routes/auth";
import { roadsRouter } from "./routes/roads";
import { trafficRouter } from "./routes/traffic";
import { eventsRouter } from "./routes/events";
import { weatherRouter } from "./routes/weather";
import { predictionsRouter } from "./routes/predictions";
import { analyticsRouter } from "./routes/analytics";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "trafficjam-api",
      db: isDbConnected() ? "connected" : "disconnected",
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/roads", roadsRouter);
  app.use("/api/traffic", trafficRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/weather", weatherRouter);
  app.use("/api/predictions", predictionsRouter);
  app.use("/api/analytics", analyticsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "not found" });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "unhandled error");
    const status = (err as { status?: number }).status ?? 500;
    res.status(status).json({ error: err.message || "internal error" });
  });

  return app;
}
