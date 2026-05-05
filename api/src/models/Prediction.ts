import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const predictionSchema = new Schema(
  {
    roadSegmentId: { type: Schema.Types.ObjectId, ref: "RoadSegment", required: true, index: true },
    predictedTrafficScore: { type: Number, required: true, min: 0, max: 10 },
    confidence: { type: Number, min: 0, max: 1 },
    selectedTime: { type: Date, required: true, index: true },
    weatherInput: { type: Schema.Types.Mixed, default: {} },
    eventInput: { type: Schema.Types.Mixed, default: {} },
    modelVersion: { type: String, required: true, default: "rule-based-v1" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

predictionSchema.index({ roadSegmentId: 1, selectedTime: -1 });

export type PredictionDoc = HydratedDocument<InferSchemaType<typeof predictionSchema>>;
export const Prediction = model("Prediction", predictionSchema);
