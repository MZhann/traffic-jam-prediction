"use client";
import { useEffect, useRef, useState } from "react";
import { ALMATY_CENTER } from "@/lib/config";
import { scoreToColor, scoreLabel, type RoadTraffic } from "@/lib/traffic";

// Yandex Maps v3 ships an `ymaps3` global on window after the script loads.
// We don't pull in @yandex/ymaps3-types (extra ~500KB of types, not needed for
// just rendering polylines).
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ymaps3: any;
  }
}

type HoverInfo = {
  name: string;
  score: number | null;
  x: number;
  y: number;
};

const YANDEX_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY || "";

let scriptLoadPromise: Promise<unknown> | null = null;

function loadYandexMaps(apiKey: string) {
  if (typeof window === "undefined") return Promise.reject("ssr");
  if (window.ymaps3) return Promise.resolve(window.ymaps3);
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-ymaps="v3"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(window.ymaps3));
      existing.addEventListener("error", () => reject(new Error("script load failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.dataset.ymaps = "v3";
    script.onload = () => resolve(window.ymaps3);
    script.onerror = () => reject(new Error("Yandex Maps script failed to load"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export default function YandexMap({ roads }: { roads: RoadTraffic[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ymapsRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const featuresRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  // Init map once
  useEffect(() => {
    if (!YANDEX_KEY) {
      setError("missing NEXT_PUBLIC_YANDEX_MAPS_KEY");
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;

    loadYandexMaps(YANDEX_KEY)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(async (ymaps3: any) => {
        if (cancelled || !containerRef.current) return;
        await ymaps3.ready;
        ymapsRef.current = ymaps3;

        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } = ymaps3;
        map = new YMap(containerRef.current, {
          location: {
            center: [ALMATY_CENTER[1], ALMATY_CENTER[0]], // [lng, lat]
            zoom: 12,
          },
          showScaleInCopyrights: true,
        });
        map.addChild(new YMapDefaultSchemeLayer({}));
        map.addChild(new YMapDefaultFeaturesLayer({}));
        mapRef.current = map;
        setReady(true);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "yandex maps load failed");
      });

    return () => {
      cancelled = true;
      try {
        featuresRef.current.forEach((f) => map?.removeChild(f));
        featuresRef.current = [];
        map?.destroy?.();
      } catch {
        // ignore teardown errors
      }
    };
  }, []);

  // Draw / redraw polylines when roads change
  useEffect(() => {
    const ymaps3 = ymapsRef.current;
    const map = mapRef.current;
    if (!ready || !ymaps3 || !map) return;

    const { YMapFeature } = ymaps3;

    // Tear down previous features
    for (const feat of featuresRef.current) {
      try {
        map.removeChild(feat);
      } catch {
        /* ignore */
      }
    }
    featuresRef.current = [];

    for (const road of roads) {
      const color = scoreToColor(road.trafficScore);
      const feature = new YMapFeature({
        id: road.roadSegmentId,
        geometry: {
          type: "LineString",
          coordinates: road.coordinates, // already [lng, lat]
        },
        style: {
          stroke: [{ color, width: 7, opacity: 0.9 }],
        },
        properties: { name: road.name, score: road.trafficScore },
        onClick: (object: unknown, e: { coordinates: [number, number]; screenCoordinates?: [number, number] }) => {
          // Show a tooltip near the click point.
          const [sx, sy] = e.screenCoordinates ?? [0, 0];
          setHover({ name: road.name, score: road.trafficScore, x: sx, y: sy });
          window.setTimeout(() => setHover(null), 2500);
        },
      });
      map.addChild(feature);
      featuresRef.current.push(feature);
    }
  }, [roads, ready]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted p-6 text-center text-sm">
        <p className="font-medium">Yandex map couldn&rsquo;t load</p>
        <p className="text-muted-foreground">{error}</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Get a free key at{" "}
          <a
            className="underline"
            href="https://developer.tech.yandex.ru/services/"
            target="_blank"
            rel="noreferrer"
          >
            developer.tech.yandex.ru
          </a>{" "}
          (JavaScript API service) and put it in <code>web/.env</code> as{" "}
          <code>NEXT_PUBLIC_YANDEX_MAPS_KEY=…</code>
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
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
