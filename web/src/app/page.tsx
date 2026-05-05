"use client";
import { MapView } from "@/components/map/MapView";
import { TrafficLegend } from "@/components/map/TrafficLegend";
import { PredictionPanel } from "@/components/map/PredictionPanel";
import { FilterSidebar } from "@/components/sidebar/FilterSidebar";
import { TrafficTimeline } from "@/components/timeline/TrafficTimeline";
import { useTraffic } from "@/hooks/useTraffic";
import { MOCK_ROADS } from "@/lib/traffic";

export default function HomePage() {
  const { data, loading, isMock } = useTraffic();
  const roads = data?.roads ?? MOCK_ROADS;
  const mode = data?.mode ?? "current";
  const eventsCount =
    !data ? 0 : typeof data.events === "number" ? data.events : data.events.length;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <FilterSidebar weather={data?.weather ?? null} eventsCount={eventsCount} />
      <div className="flex flex-1 flex-col">
        <div className="relative flex-1">
          <MapView roads={roads} mode={mode} />
          <PredictionPanel data={data} isMock={isMock} />
          <TrafficLegend />
          {loading && (
            <div className="absolute right-4 top-4 z-[400] rounded bg-background/90 px-3 py-1 text-xs shadow">
              loading…
            </div>
          )}
        </div>
        <TrafficTimeline />
      </div>
    </div>
  );
}
