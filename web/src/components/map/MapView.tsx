"use client";
import dynamic from "next/dynamic";
import type { RoadTraffic } from "@/lib/traffic";

type Mode = "current" | "history" | "prediction";

const HAS_YANDEX_KEY = Boolean(process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY);
const HAS_2GIS_KEY = Boolean(process.env.NEXT_PUBLIC_MAPGL_KEY);

const YandexMap = dynamic(() => import("./YandexMap"), {
  ssr: false,
  loading: () => <Loading />,
});

const TwoGisMap = dynamic(() => import("./TwoGisMap"), {
  ssr: false,
  loading: () => <Loading />,
});

const TrafficMap = dynamic(() => import("./TrafficMap"), {
  ssr: false,
  loading: () => <Loading />,
});

export function MapView({ roads, mode }: { roads: RoadTraffic[]; mode: Mode }) {
  if (HAS_YANDEX_KEY) return <YandexMap roads={roads} />;
  if (HAS_2GIS_KEY) return <TwoGisMap roads={roads} mode={mode} />;
  return <TrafficMap roads={roads} />;
}

function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <span className="text-sm text-muted-foreground">Loading map…</span>
    </div>
  );
}
