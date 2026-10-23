// Shows the AI quality score on an item. Items with too few reviews show "New".

const COLORS: Record<string, string> = {
  Excellent: "bg-emerald-100 text-emerald-800",
  Good: "bg-sky-100 text-sky-800",
  Fair: "bg-amber-100 text-amber-800",
  "Needs care": "bg-rose-100 text-rose-800",
};

export default function QualityBadge({
  score,
  label,
}: {
  score: number | null;
  label: string | null;
}) {
  if (score === null || label === null) {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
        New, not yet rated
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[label] ?? "bg-zinc-100 text-zinc-700"}`}
    >
      {label} · {score.toFixed(1)}
    </span>
  );
}
