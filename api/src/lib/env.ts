import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().min(8).default("dev-only-change-me-in-prod"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  OPENWEATHER_API_KEY: z.string().optional(),
  ML_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  LOG_LEVEL: z.string().default("info"),
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
