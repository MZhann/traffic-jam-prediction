"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { AdminGuard } from "@/components/AdminGuard";

type Event = {
  _id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  impactLevel: number;
  description: string;
};

export default function AdminEventsPage() {
  return (
    <AdminGuard>
      <Inner />
    </AdminGuard>
  );
}

function Inner() {
  const token = useAuth((s) => s.token);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ events: Event[] }>("/api/events");
      setEvents(res.events);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete event?")) return;
    try {
      await api.delete(`/api/events/${id}`, token);
      setEvents((e) => e.filter((x) => x._id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "delete failed");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground">
            Marathons, road repairs, holidays — anything that affects traffic.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            ← Map
          </Link>
          <Link
            href="/admin/events/new"
            className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            + New event
          </Link>
        </div>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">loading…</p>
      ) : events.length === 0 ? (
        <p className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          no events yet — create one to see it on the map
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">When</th>
                <th className="px-4 py-2 text-left">Impact</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e._id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{e.title}</td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">
                    {e.type}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(e.startTime).toLocaleString()} →{" "}
                    {new Date(e.endTime).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">{e.impactLevel}/10</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => remove(e._id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
