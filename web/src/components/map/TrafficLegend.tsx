"use client";
const STEPS = [
  { range: "0–2", label: "free", color: "#22c55e" },
  { range: "3–4", label: "medium", color: "#eab308" },
  { range: "5–6", label: "heavy", color: "#f97316" },
  { range: "7–8", label: "jam", color: "#ef4444" },
  { range: "9–10", label: "gridlock", color: "#7f1d1d" },
];

export function TrafficLegend() {
  return (
    <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-1 rounded-md border border-border bg-card/95 p-3 text-xs shadow backdrop-blur">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Traffic score
      </div>
      {STEPS.map((s) => (
        <div key={s.range} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-6 rounded"
            style={{ background: s.color }}
          />
          <span className="font-mono">{s.range}</span>
          <span className="text-muted-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
