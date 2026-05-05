import mongoose from "mongoose";
import { logger } from "../lib/logger";

// Fail fast on queries when not connected so requests don't hang for 10s.
mongoose.set("bufferCommands", false);

let connected = false;

export async function connectDb(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.warn("MONGODB_URI not set — running without database");
    return false;
  }
  if (connected) return true;

  try {
    await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    connected = true;
    logger.info({ uri: redact(uri) }, "mongo connected");
    return true;
  } catch (err) {
    logger.error({ err }, "mongo connection failed — continuing without db");
    return false;
  }
}

export function isDbConnected(): boolean {
  return connected && mongoose.connection.readyState === 1;
}

function redact(uri: string): string {
  return uri.replace(/\/\/([^@]+)@/, "//<redacted>@");
}
