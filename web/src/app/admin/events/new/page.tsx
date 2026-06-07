"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { AdminGuard } from "@/components/AdminGuard";

const schema = z.object({
  title: z.string().min(2).max(200),
  type: z.enum(["marathon", "concert", "match", "repair", "holiday", "accident", "festival"]),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  impactLevel: z.coerce.number().int().min(1).max(10),
  description: z.string().optional(),
  affectedRoads: z.array(z.string()).default([]),
});
type FormValues = z.infer<typeof schema>;

type Road = { _id: string; name: string };

export default function NewEventPage() {
  return (
    <AdminGuard>
      <Inner />
    </AdminGuard>
  );
}

function Inner() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const [roads, setRoads] = useState<Road[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "repair", impactLevel: 5, description: "", affectedRoads: [] },
  });

  useEffect(() => {
    api
      .get<{ roads: Road[] }>("/api/roads")
      .then((r) => setRoads(r.roads))
      .catch(() => setRoads([]));
  }, []);

  async function onSubmit(values: FormValues) {
    setErr(null);
    setSubmitting(true);
    try {
      await api.post(
        "/api/events",
        {
          ...values,
          startTime: new Date(values.startTime).toISOString(),
          endTime: new Date(values.endTime).toISOString(),
        },
        token
      );
      router.push("/admin/events");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New event</h1>
        <Link
          href="/admin/events"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← back
        </Link>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-lg border border-border bg-card p-6"
      >
        <Field label="Title" error={errors.title?.message}>
          <input
            {...register("title")}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type" error={errors.type?.message}>
            <select
              {...register("type")}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="marathon">Marathon</option>
              <option value="concert">Concert</option>
              <option value="match">Match</option>
              <option value="repair">Road repair</option>
              <option value="holiday">Holiday</option>
              <option value="accident">Accident</option>
              <option value="festival">Festival</option>
            </select>
          </Field>
          <Field label="Impact level (1–10)" error={errors.impactLevel?.message}>
            <input
              type="number"
              min={1}
              max={10}
              {...register("impactLevel")}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start time" error={errors.startTime?.message}>
            <input
              type="datetime-local"
              {...register("startTime")}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="End time" error={errors.endTime?.message}>
            <input
              type="datetime-local"
              {...register("endTime")}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </div>
        <Field label="Affected roads (Ctrl+click to multi-select)">
          <Controller
            name="affectedRoads"
            control={control}
            render={({ field }) => (
              <select
                multiple
                value={field.value}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (o) => o.value);
                  field.onChange(selected);
                }}
                className="h-32 w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {roads.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
                {roads.length === 0 && <option disabled>seed roads first</option>}
              </select>
            )}
          />
        </Field>
        <Field label="Description">
          <textarea
            {...register("description")}
            rows={3}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button
          disabled={submitting}
          className="w-full rounded bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "creating…" : "Create event"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
