"use client";
import { useEffect, useRef, useState } from "react";
import { load } from "@2gis/mapgl";
import type * as mapgl from "@2gis/mapgl/types";
import { ALMATY_CENTER } from "@/lib/config";
import { scoreToColor, scoreLabel, type RoadTraffic } from "@/lib/traffic";

type Mode = "current" | "history" | "prediction";

type HoverInfo = {
  name: string;
  score: number | null;
  x: number;
  y: number;
};

const MAPGL_KEY = process.env.NEXT_PUBLIC_MAPGL_KEY || "";

export default function TwoGisMap({
  roads,
  mode,
}: {
  roads: RoadTraffic[];
  mode: Mode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapgl.Map | null>(null);
  const apiRef = useRef<typeof mapgl | null>(null);
  const polylinesRef = useRef<mapgl.Polyline[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  // Init map once
  useEffect(() => {
    if (!MAPGL_KEY) {
      setError("missing NEXT_PUBLIC_MAPGL_KEY");
      return;
    }
    let cancelled = false;
    let map: mapgl.Map | null = null;

    load()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        apiRef.current = api;
        map = new api.Map(containerRef.current, {
          center: [ALMATY_CENTER[1], ALMATY_CENTER[0]],
          zoom: 12,
          minZoom: 10,
          maxZoom: 17,
          key: MAPGL_KEY,
          trafficOn: true,
          trafficControl: "topRight",
          zoomControl: "topRight",
        });
        mapRef.current = map;
        setReady(true);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "failed to load 2GIS MapGL");
      });

    return () => {
      cancelled = true;
      try {
        polylinesRef.current.forEach((p) => p.destroy());
        polylinesRef.current = [];
        map?.destroy();
      } catch {
        /* ignore teardown errors */
      }
    };
  }, []);

  // Mode-aware overlay:
  //   "current"  → 2GIS native traffic layer (no overlay)
  //   "history"  → hide native, show our scored polylines from MongoDB history
  //   "prediction" → hide native, show our ML-scored polylines
  useEffect(() => {
    const api = apiRef.current;
    const map = mapRef.current;
    if (!ready || !api || !map) return;

    polylinesRef.current.forEach((p) => p.destroy());
    polylinesRef.current = [];

    if (mode === "current") {
      if (!map.isTrafficOn()) map.showTraffic();
      return;
    }

    if (map.isTrafficOn()) map.hideTraffic();

    // Render in two passes so colored lines from one road don't get covered
    // by another road's outline.
    for (const road of roads) {
      const outline = new api.Polyline(map, {
        coordinates: road.coordinates,
        color: "#0b1220",
        width: 5,
        zIndex: 100,
      });
      polylinesRef.current.push(outline);
    }
    for (const road of roads) {
      const color = scoreToColor(road.trafficScore);
      const line = new api.Polyline(map, {
        coordinates: road.coordinates,
        color,
        width: 3,
        zIndex: 101,
      });
      line.userData = { road };
      line.on("mouseover", (e) => {
        const data = (line.userData as { road: RoadTraffic }).road;
        setHover({
          name: data.name,
          score: data.trafficScore,
          x: e.point[0],
          y: e.point[1],
        });
        if (containerRef.current) containerRef.current.style.cursor = "pointer";
      });
      line.on("mouseout", () => {
        setHover(null);
        if (containerRef.current) containerRef.current.style.cursor = "";
      });
      polylinesRef.current.push(line);
    }
  }, [mode, roads, ready]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted p-6 text-center text-sm">
        <p className="font-medium">2GIS map couldn&rsquo;t load</p>
        <p className="text-muted-foreground">{error}</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Get a free key at{" "}
          <a
            className="underline"
            href="https://platform.2gis.com/"
            target="_blank"
            rel="noreferrer"
          >
            platform.2gis.com
          </a>{" "}
          and put it in <code>web/.env</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {mode !== "current" && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[400] -translate-x-1/2 rounded-full border border-border bg-card/95 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground shadow backdrop-blur">
          {mode} · ML overlay
        </div>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-[400] -translate-x-1/2 -translate-y-full rounded border border-border bg-card/95 px-2 py-1 text-xs shadow"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          <div className="font-semibold">{hover.name}</div>
          <div>
            score:{" "}
            <span style={{ color: scoreToColor(hover.score) }}>
              {hover.score?.toFixed(1) ?? "—"}
            </span>{" "}
            <span className="text-muted-foreground">
              ({scoreLabel(hover.score)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
