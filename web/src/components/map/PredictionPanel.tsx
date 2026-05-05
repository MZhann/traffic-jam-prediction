"use client";
import type { TrafficResponse } from "@/lib/traffic";

export function PredictionPanel({
  data,
  isMock,
}: {
  data: TrafficResponse | null;
  isMock: boolean;
}) {
  if (!data) return null;
  const avg =
    data.roads.length > 0
      ? data.roads
          .map((r) => r.trafficScore ?? 0)
          .reduce((a, b) => a + b, 0) / data.roads.length
      : 0;
  const eventCount = typeof data.events === "number" ? data.events : data.events.length;

  return (
    <div className="absolute left-4 top-4 z-[400] flex min-w-56 flex-col gap-1 rounded-md border border-border bg-card/95 p-3 text-xs shadow backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {data.mode}
        </span>
        {isMock && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
            mock
          </span>
        )}
      </div>
      <div className="text-base font-semibold tabular-nums">
        avg score: {avg.toFixed(1)} / 10
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>roads</span>
        <span>{data.roads.length}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>events</span>
        <span>{eventCount}</span>
      </div>
      {data.weather && (
        <div className="flex justify-between text-muted-foreground">
          <span>weather</span>
          <span className="capitalize">
            {data.weather.condition}, {data.weather.temperature.toFixed(0)}°
          </span>
        </div>
      )}
    </div>
  );
}
