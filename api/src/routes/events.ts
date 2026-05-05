import { Router } from "express";
import { z } from "zod";
import { Event } from "../models";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const eventsRouter = Router();

const eventSchema = z.object({
  title: z.string().min(2).max(200),
  type: z.enum(["marathon", "concert", "match", "repair", "holiday", "accident", "festival"]),
  affectedRoads: z.array(z.string()).default([]),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  impactLevel: z.number().int().min(1).max(10),
  description: z.string().optional().default(""),
});

eventsRouter.get("/", async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (req.query.active === "true") {
    const now = new Date();
    filter.startTime = { $lte: now };
    filter.endTime = { $gte: now };
  }
  const events = await Event.find(filter).sort({ startTime: -1 }).lean();
  res.json({ events });
});

eventsRouter.get("/:id", async (req, res) => {
  const event = await Event.findById(req.params.id).populate("affectedRoads").lean();
  if (!event) return res.status(404).json({ error: "event not found" });
  res.json({ event });
});

eventsRouter.post("/", requireAuth, requireAdmin, validateBody(eventSchema), async (req, res) => {
  const body = req.body as z.infer<typeof eventSchema>;
  const event = await Event.create({
    ...body,
    startTime: new Date(body.startTime),
    endTime: new Date(body.endTime),
    createdBy: req.user!.sub,
  });
  res.status(201).json({ event });
});

eventsRouter.patch("/:id", requireAuth, requireAdmin, validateBody(eventSchema.partial()), async (req, res) => {
  const updates: Record<string, unknown> = { ...req.body };
  if (typeof updates.startTime === "string") updates.startTime = new Date(updates.startTime);
  if (typeof updates.endTime === "string") updates.endTime = new Date(updates.endTime);
  const event = await Event.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!event) return res.status(404).json({ error: "event not found" });
  res.json({ event });
});

eventsRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const result = await Event.findByIdAndDelete(req.params.id);
  if (!result) return res.status(404).json({ error: "event not found" });
  res.status(204).send();
});
