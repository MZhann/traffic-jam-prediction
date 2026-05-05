export type RoadTraffic = {
  roadSegmentId: string;
  name: string;
  coordinates: number[][];
  trafficScore: number | null;
  source?: "history" | "current" | "prediction";
};

export type TrafficResponse = {
  mode: "history" | "current" | "prediction";
  selectedTime: string;
  weather: {
    condition: string;
    temperature: number;
    windSpeed?: number;
    humidity?: number;
  } | null;
  events: { _id?: string; title?: string; impactLevel?: number }[] | number;
  roads: RoadTraffic[];
};

export function scoreToColor(score: number | null): string {
  if (score === null) return "#9ca3af";
  if (score < 3) return "#22c55e"; // green
  if (score < 5) return "#eab308"; // yellow
  if (score < 7) return "#f97316"; // orange
  if (score < 9) return "#ef4444"; // red
  return "#7f1d1d"; // dark red
}

export function scoreLabel(score: number | null): string {
  if (score === null) return "no data";
  if (score < 3) return "free";
  if (score < 5) return "medium";
  if (score < 7) return "heavy";
  if (score < 9) return "jam";
  return "gridlock";
}

// Mock Almaty road segments — used when API is unreachable so the map still renders.
export const MOCK_ROADS: RoadTraffic[] = [
  {
    roadSegmentId: "mock-1",
    name: "Abay Avenue (центр)",
    coordinates: [
      [76.85, 43.245],
      [76.92, 43.245],
      [76.97, 43.247],
    ],
    trafficScore: 7.5,
  },
  {
    roadSegmentId: "mock-2",
    name: "Dostyk Avenue",
    coordinates: [
      [76.962, 43.2],
      [76.962, 43.235],
      [76.965, 43.27],
    ],
    trafficScore: 8.2,
  },
  {
    roadSegmentId: "mock-3",
    name: "Al-Farabi Avenue",
    coordinates: [
      [76.85, 43.215],
      [76.92, 43.21],
      [76.99, 43.205],
    ],
    trafficScore: 6.0,
  },
  {
    roadSegmentId: "mock-4",
    name: "Raiymbek Avenue",
    coordinates: [
      [76.86, 43.27],
      [76.92, 43.272],
      [76.99, 43.273],
    ],
    trafficScore: 4.5,
  },
  {
    roadSegmentId: "mock-5",
    name: "Saina Avenue",
    coordinates: [
      [76.86, 43.21],
      [76.86, 43.27],
    ],
    trafficScore: 3.0,
  },
  {
    roadSegmentId: "mock-6",
    name: "Tole Bi Street",
    coordinates: [
      [76.87, 43.255],
      [76.93, 43.256],
      [76.98, 43.257],
    ],
    trafficScore: 5.5,
  },
  {
    roadSegmentId: "mock-7",
    name: "Gagarin Avenue",
    coordinates: [
      [76.91, 43.205],
      [76.911, 43.27],
    ],
    trafficScore: 6.8,
  },
  {
    roadSegmentId: "mock-8",
    name: "Seifullin Avenue",
    coordinates: [
      [76.946, 43.21],
      [76.945, 43.27],
    ],
    trafficScore: 7.0,
  },
];
