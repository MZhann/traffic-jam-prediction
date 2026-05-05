import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    type: {
      type: String,
      enum: ["marathon", "concert", "match", "repair", "holiday", "accident", "festival"],
      required: true,
    },
    affectedRoads: [{ type: Schema.Types.ObjectId, ref: "RoadSegment" }],
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    impactLevel: { type: Number, min: 1, max: 10, required: true },
    description: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

eventSchema.index({ startTime: 1, endTime: 1 });
eventSchema.pre("validate", function (next) {
  if (this.endTime && this.startTime && this.endTime <= this.startTime) {
    next(new Error("endTime must be after startTime"));
    return;
  }
  next();
});

export type EventType =
  | "marathon"
  | "concert"
  | "match"
  | "repair"
  | "holiday"
  | "accident"
  | "festival";
export type EventDoc = HydratedDocument<InferSchemaType<typeof eventSchema>>;
export const Event = model("Event", eventSchema);
