"use client";
import Link from "next/link";
import { useFilters } from "@/store/filters";
import { useAuth } from "@/store/auth";

export function FilterSidebar({
  weather,
  eventsCount,
}: {
  weather: { condition: string; temperature: number } | null;
  eventsCount: number;
}) {
  const f = useFilters();
  const { user, clear } = useAuth();

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col gap-4 border-r border-border bg-card p-4 text-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">TrafficJam</h2>
        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          Almaty
        </span>
      </header>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
          Filters
        </h3>
        <Toggle
          label="Weather influence"
          active={f.weatherEnabled}
          onClick={() => f.toggle("weatherEnabled")}
        />
        <Toggle
          label="Events"
          active={f.eventsEnabled}
          onClick={() => f.toggle("eventsEnabled")}
        />
        <Toggle
          label="Time of day"
          active={f.timeInfluence}
          onClick={() => f.toggle("timeInfluence")}
        />
        <Toggle
          label="Day of week"
          active={f.dayOfWeek}
          onClick={() => f.toggle("dayOfWeek")}
        />
        <Toggle
          label="ML prediction"
          active={f.mlEnabled}
          onClick={() => f.toggle("mlEnabled")}
        />
      </section>

      <section className="rounded-md border border-border bg-background p-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
          Conditions
        </h3>
        <div className="mt-2 flex flex-col gap-1">
          {weather ? (
            <div className="flex items-center justify-between">
              <span className="capitalize">{weather.condition}</span>
              <span className="font-medium">
                {weather.temperature.toFixed(0)}°C
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">no weather data</span>
          )}
          <div className="flex items-center justify-between text-muted-foreground">
            <span>active events</span>
            <span>{eventsCount}</span>
          </div>
        </div>
      </section>

      <nav className="flex flex-col gap-1 text-sm">
        <Link className="rounded px-2 py-1 hover:bg-muted" href="/">
          Map
        </Link>
        <Link className="rounded px-2 py-1 hover:bg-muted" href="/history">
          History
        </Link>
        <Link className="rounded px-2 py-1 hover:bg-muted" href="/analytics">
          Analytics
        </Link>
        {user?.role === "admin" && (
          <Link className="rounded px-2 py-1 hover:bg-muted" href="/admin/events">
            Admin · Events
          </Link>
        )}
      </nav>

      <div className="mt-auto rounded-md border border-border bg-background p-3 text-xs">
        {user ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-muted-foreground">{user.role}</div>
            </div>
            <button
              onClick={clear}
              className="rounded bg-muted px-2 py-1 hover:bg-muted/70"
            >
              sign out
            </button>
          </div>
        ) : (
          <div className="flex justify-between">
            <Link href="/login" className="font-medium hover:underline">
              Sign in
            </Link>
            <Link href="/register" className="text-muted-foreground hover:underline">
              register
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left transition hover:bg-muted"
      aria-pressed={active}
    >
      <span>{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          active ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            active ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
