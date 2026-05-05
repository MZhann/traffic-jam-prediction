import { Router } from "express";
import { z } from "zod";
import { RoadSegment } from "../models";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const roadsRouter = Router();

const upsertSchema = z.object({
  name: z.string().min(2),
  district: z.string().min(2),
  roadType: z.enum(["main", "secondary", "highway"]).optional(),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
});

roadsRouter.get("/", async (_req, res) => {
  const roads = await RoadSegment.find().lean();
  res.json({ roads });
});

roadsRouter.get("/:id", async (req, res) => {
  const road = await RoadSegment.findById(req.params.id).lean();
  if (!road) return res.status(404).json({ error: "road not found" });
  res.json({ road });
});

roadsRouter.post("/", requireAuth, requireAdmin, validateBody(upsertSchema), async (req, res) => {
  const road = await RoadSegment.create(req.body);
  res.status(201).json({ road });
});

roadsRouter.patch("/:id", requireAuth, requireAdmin, validateBody(upsertSchema.partial()), async (req, res) => {
  const road = await RoadSegment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!road) return res.status(404).json({ error: "road not found" });
  res.json({ road });
});

roadsRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const result = await RoadSegment.findByIdAndDelete(req.params.id);
  if (!result) return res.status(404).json({ error: "road not found" });
  res.status(204).send();
});
