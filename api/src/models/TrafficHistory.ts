import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from "mongoose";

const trafficHistorySchema = new Schema(
  {
    roadSegmentId: { type: Schema.Types.ObjectId, ref: "RoadSegment", required: true, index: true },
    trafficScore: { type: Number, required: true, min: 0, max: 10 },
    averageSpeed: { type: Number, min: 0, max: 200 },
    timestamp: { type: Date, required: true, index: true },
    source: {
      type: String,
      enum: ["dataset", "api", "manual", "synthetic"],
      default: "dataset",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

trafficHistorySchema.index({ roadSegmentId: 1, timestamp: -1 });

export type TrafficHistoryDoc = HydratedDocument<InferSchemaType<typeof trafficHistorySchema>>;
export const TrafficHistory = model("TrafficHistory", trafficHistorySchema);

export type TrafficHistoryInput = {
  roadSegmentId: Types.ObjectId | string;
  trafficScore: number;
  averageSpeed?: number;
  timestamp: Date;
  source?: "dataset" | "api" | "manual" | "synthetic";
};
