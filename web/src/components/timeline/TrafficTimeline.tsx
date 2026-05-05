"use client";
import { useMemo } from "react";
import { useFilters } from "@/store/filters";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function TrafficTimeline() {
  const { selectedTime, setSelectedTime, resetTime } = useFilters();

  const dayLabel = useMemo(
    () =>
      selectedTime.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    [selectedTime]
  );

  const mode = useMemo(() => {
    const diff = selectedTime.getTime() - Date.now();
    if (Math.abs(diff) <= 15 * 60 * 1000) return "current";
    return diff < 0 ? "history" : "prediction";
  }, [selectedTime]);

  function shiftDay(deltaDays: number) {
    const d = new Date(selectedTime);
    d.setDate(d.getDate() + deltaDays);
    setSelectedTime(d);
  }

  function setHour(hour: number) {
    const d = new Date(selectedTime);
    d.setHours(hour, 0, 0, 0);
    setSelectedTime(d);
  }

  const currentHour = selectedTime.getHours();
  const nowHour = new Date().getHours();
  const isToday = isSameDay(selectedTime, new Date());

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDay(-1)}
            className="rounded border border-border px-2 py-1 text-sm hover:bg-muted"
            aria-label="Previous day"
          >
            ←
          </button>
          <div className="min-w-32 text-center text-sm font-medium">{dayLabel}</div>
          <button
            onClick={() => shiftDay(1)}
            className="rounded border border-border px-2 py-1 text-sm hover:bg-muted"
            aria-label="Next day"
          >
            →
          </button>
          <button
            onClick={resetTime}
            className="ml-2 rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            now
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-medium uppercase tracking-wider ${
              mode === "history"
                ? "bg-blue-100 text-blue-700"
                : mode === "current"
                  ? "bg-green-100 text-green-700"
                  : "bg-purple-100 text-purple-700"
            }`}
          >
            {mode}
          </span>
          <span className="font-mono text-muted-foreground">
            {selectedTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-px overflow-x-auto">
        {HOURS.map((h) => {
          const isSelected = h === currentHour;
          const isCurrentMarker = isToday && h === nowHour;
          return (
            <button
              key={h}
              onClick={() => setHour(h)}
              className={`relative min-w-10 rounded px-1 py-2 text-center text-xs transition ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isCurrentMarker
                    ? "bg-green-500/20 text-green-700"
                    : "hover:bg-muted"
              }`}
            >
              {String(h).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
