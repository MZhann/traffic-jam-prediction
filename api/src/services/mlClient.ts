import { env } from "../lib/env";

export type MlPredictRequest = {
  selectedTime: string;
  weather: {
    condition: string;
    temperature: number;
    windSpeed?: number;
    humidity?: number;
  } | null;
  events: { impactLevel: number; affectedRoads?: string[] }[];
  roads: { id: string; name: string; roadType?: string }[];
};

export type MlPredictResponse = {
  modelVersion: string;
  predictions: { roadSegmentId: string; score: number; confidence: number }[];
};

export async function callMlService(req: MlPredictRequest): Promise<MlPredictResponse> {
  const res = await fetch(`${env.ML_SERVICE_URL}/predict`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`ml service ${res.status}`);
  return (await res.json()) as MlPredictResponse;
}
