"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { api } from "@/lib/api";

type ByHour = { hour: number; avgScore: number; count: number };
type Busiest = { roadSegmentId: string; name: string; avgScore: number };
type ByWeekday = { weekday: string; avgScore: number };

export default function AnalyticsPage() {
  const [byHour, setByHour] = useState<ByHour[]>([]);
  const [busiest, setBusiest] = useState<Busiest[]>([]);
  const [byWeekday, setByWeekday] = useState<ByWeekday[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ data: ByHour[] }>("/api/analytics/by-hour"),
      api.get<{ data: Busiest[] }>("/api/analytics/busiest-roads"),
      api.get<{ data: ByWeekday[] }>("/api/analytics/by-weekday"),
    ])
      .then(([h, b, w]) => {
        setByHour(h.data);
        setBusiest(b.data);
        setByWeekday(w.data);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "load failed"))
      .finally(() => setLoading(false));
  }, []);

  const hasData = byHour.length > 0 || busiest.length > 0 || byWeekday.length > 0;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Aggregated traffic patterns across the recorded history.
          </p>
        </div>
        <Link
          href="/"
          className="rounded border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          ← Map
        </Link>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">loading…</p>
      ) : !hasData ? (
        <div className="rounded border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No traffic history yet. Run the seed script (<code>npm run seed</code> from <code>api/</code>) to load synthetic Almaty data.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Average traffic by hour" subtitle="0–23 over recorded history">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={byHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tickFormatter={(v) => `${v}h`} />
                <YAxis domain={[0, 10]} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <ReferenceLine y={6} stroke="#f97316" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Top 10 busiest roads" subtitle="By average traffic score">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={busiest} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 10]} />
                <YAxis dataKey="name" type="category" width={140} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar dataKey="avgScore" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Average by weekday" subtitle="Sun → Sat">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byWeekday}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="weekday" />
                <YAxis domain={[0, 10]} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar dataKey="avgScore" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <AIInsightCard byHour={byHour} byWeekday={byWeekday} busiest={busiest} />
        </div>
      )}
    </main>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="mb-3">
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function AIInsightCard({
  byHour,
  byWeekday,
  busiest,
}: {
  byHour: ByHour[];
  byWeekday: ByWeekday[];
  busiest: Busiest[];
}) {
  const peak = byHour.reduce<ByHour | null>(
    (a, b) => (!a || b.avgScore > a.avgScore ? b : a),
    null
  );
  const calmest = byWeekday.reduce<ByWeekday | null>(
    (a, b) => (!a || b.avgScore < a.avgScore ? b : a),
    null
  );
  const worstRoad = busiest[0];

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="mb-2">
        <h2 className="font-semibold">AI insights</h2>
        <p className="text-xs text-muted-foreground">
          Auto-summarized from current aggregates.
        </p>
      </header>
      <ul className="space-y-2 text-sm leading-relaxed">
        {peak && (
          <li>
            Peak congestion happens around{" "}
            <span className="font-semibold">{peak.hour}:00</span> with an average
            score of {peak.avgScore.toFixed(1)}/10.
          </li>
        )}
        {calmest && (
          <li>
            Quietest day of the week is{" "}
            <span className="font-semibold">{calmest.weekday}</span> at{" "}
            {calmest.avgScore.toFixed(1)}/10 average — good for non-urgent travel.
          </li>
        )}
        {worstRoad && (
          <li>
            <span className="font-semibold">{worstRoad.name}</span> is the
            highest-load road segment in the dataset (avg {worstRoad.avgScore.toFixed(1)}/10).
          </li>
        )}
      </ul>
    </section>
  );
}
