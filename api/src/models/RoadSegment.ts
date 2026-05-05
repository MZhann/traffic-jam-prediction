import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const roadSegmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    roadType: {
      type: String,
      enum: ["main", "secondary", "highway"],
      default: "main",
      required: true,
    },
    coordinates: {
      type: [[Number]],
      required: true,
      validate: {
        validator: (v: number[][]) =>
          Array.isArray(v) && v.length >= 2 && v.every((p) => p.length === 2),
        message: "coordinates must be [[lng, lat], ...] with at least two points",
      },
    },
    osmId: { type: Number, sparse: true, index: true },
  },
  { timestamps: true }
);

roadSegmentSchema.index({ name: 1 });
roadSegmentSchema.index({ district: 1 });

export type RoadSegmentDoc = HydratedDocument<InferSchemaType<typeof roadSegmentSchema>>;
export const RoadSegment = model("RoadSegment", roadSegmentSchema);
