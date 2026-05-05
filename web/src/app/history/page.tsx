"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "@/lib/api";

type Road = { _id: string; name: string };
type Entry = { timestamp: string; trafficScore: number };

export default function HistoryPage() {
  const [roads, setRoads] = useState<Road[]>([]);
  const [roadId, setRoadId] = useState<string>("");
  const [from, setFrom] = useState<string>(toDateInput(daysAgo(7)));
  const [to, setTo] = useState<string>(toDateInput(new Date()));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ roads: Road[] }>("/api/roads")
      .then((r) => {
        setRoads(r.roads);
        if (r.roads[0]) setRoadId(r.roads[0]._id);
      })
      .catch(() => setRoads([]));
  }, []);

  useEffect(() => {
    if (!roadId) return;
    setLoading(true);
    setErr(null);
    api
      .get<{ history: Entry[] }>(
        `/api/traffic/road/${roadId}/history?from=${new Date(from).toISOString()}&to=${new Date(to).toISOString()}`
      )
      .then((r) => setEntries(r.history))
      .catch((e) => setErr(e instanceof Error ? e.message : "load failed"))
      .finally(() => setLoading(false));
  }, [roadId, from, to]);

  const chartData = entries.map((e) => ({
    t: new Date(e.timestamp).toLocaleString([], {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
    }),
    score: e.trafficScore,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-sm text-muted-foreground">
            Past traffic scores for individual road segments.
          </p>
        </div>
        <Link
          href="/"
          className="rounded border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          ← Map
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Road</span>
          <select
            value={roadId}
            onChange={(e) => setRoadId(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          >
            {roads.length === 0 && <option>seed data first</option>}
            {roads.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </section>

      {err && <p className="text-sm text-destructive">{err}</p>}

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-2 font-semibold">Traffic score over time</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">loading…</p>
        ) : entries.length === 0 ? (
          <p className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No entries in this range. Try a wider date window or seed data.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="t" interval="preserveStartEnd" />
              <YAxis domain={[0, 10]} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>
    </main>
  );
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function toDateInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
