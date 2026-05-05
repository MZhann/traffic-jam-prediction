"use client";
import { useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { MOCK_ROADS, type TrafficResponse, type RoadTraffic } from "@/lib/traffic";
import { useFilters } from "@/store/filters";

const POLL_MS = 30_000;

export function useTraffic() {
  const { selectedTime, weatherEnabled, eventsEnabled, mlEnabled } = useFilters();
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: TrafficResponse | null;
    isMock: boolean;
  }>({ loading: true, error: null, data: null, isMock: false });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const params = new URLSearchParams({
          time: selectedTime.toISOString(),
          weatherEnabled: String(weatherEnabled),
          eventsEnabled: String(eventsEnabled),
        });
        let data: TrafficResponse;

        const isFuture = selectedTime.getTime() - Date.now() > 60_000;
        if (isFuture && mlEnabled) {
          data = await api.post<TrafficResponse>("/api/predictions", {
            selectedTime: selectedTime.toISOString(),
            weatherEnabled,
            eventsEnabled,
            useMl: true,
          });
        } else {
          data = await api.get<TrafficResponse>(`/api/traffic?${params.toString()}`);
        }
        if (!cancelled) setState({ loading: false, error: null, data, isMock: false });
      } catch (err) {
        const msg = err instanceof ApiRequestError ? err.message : "API unreachable — using mock";
        if (cancelled) return;
        setState({
          loading: false,
          error: msg,
          data: makeMockResponse(selectedTime, MOCK_ROADS),
          isMock: true,
        });
      }
    }

    load();
    const isCurrent = Math.abs(selectedTime.getTime() - Date.now()) < 60_000;
    if (isCurrent) {
      timer = setInterval(load, POLL_MS);
    }
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [selectedTime, weatherEnabled, eventsEnabled, mlEnabled]);

  return state;
}

function makeMockResponse(time: Date, roads: RoadTraffic[]): TrafficResponse {
  const diff = time.getTime() - Date.now();
  const mode: TrafficResponse["mode"] =
    Math.abs(diff) < 60_000 ? "current" : diff < 0 ? "history" : "prediction";
  return {
    mode,
    selectedTime: time.toISOString(),
    weather: null,
    events: 0,
    roads,
  };
}
