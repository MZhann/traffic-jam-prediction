import { Event, type EventDoc } from "../models";
import { isDbConnected } from "../db/connect";

export async function getActiveEvents(at: Date): Promise<EventDoc[]> {
  if (!isDbConnected()) return [];
  return Event.find({ startTime: { $lte: at }, endTime: { $gte: at } }).lean() as unknown as EventDoc[];
}
