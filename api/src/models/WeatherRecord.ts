import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const weatherRecordSchema = new Schema(
  {
    timestamp: { type: Date, required: true, unique: true, index: true },
    temperature: { type: Number, required: true },
    condition: {
      type: String,
      enum: ["clear", "cloudy", "rain", "snow", "fog", "storm"],
      required: true,
    },
    windSpeed: { type: Number, min: 0, default: 0 },
    humidity: { type: Number, min: 0, max: 100, default: 50 },
    visibility: { type: Number, min: 0, default: 10000 },
    source: { type: String, enum: ["openweather", "manual", "mock"], default: "openweather" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type WeatherCondition = "clear" | "cloudy" | "rain" | "snow" | "fog" | "storm";
export type WeatherRecordDoc = HydratedDocument<InferSchemaType<typeof weatherRecordSchema>>;
export const WeatherRecord = model("WeatherRecord", weatherRecordSchema);
