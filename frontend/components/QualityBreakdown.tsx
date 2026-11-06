import type { Review } from "@/lib/api";
import QualityBadge from "./QualityBadge";

// Explains the AI quality score on the item page, so it's not a black box.
// Weights must match backend/app/ai/quality.py.
export default function QualityBreakdown({
  score,
  label,
  reviews,
}: {
  score: number | null;
  label: string | null;
  reviews: Review[];
}) {
  const count = reviews.length;
  const avg = count ? reviews.reduce((sum, r) => sum + r.stars, 0) / count : null;
  const perStar = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    n: reviews.filter((r) => r.stars === stars).length,
  }));

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-zinc-900">Quality score</h2>
        <QualityBadge score={score} label={label} />
      </div>

      {score === null ? (
        <p className="mt-2 text-sm text-zinc-600">
          Not enough reviews yet. Items get a score after 2 reviews.
        </p>
      ) : (
        <p className="mt-2 text-sm text-zinc-600">
          {score.toFixed(1)} out of 5, from {count} review{count === 1 ? "" : "s"}
          {avg !== null && <> (average {avg.toFixed(1)} stars)</>}.
        </p>
      )}

      {count > 0 && (
        <ul className="mt-4 space-y-1.5" aria-label="Star rating breakdown">
          {perStar.map(({ stars, n }) => (
            <li key={stars} className="flex items-center gap-2 text-xs text-zinc-600">
              <span className="w-8 tabular-nums">{stars} ★</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                <span
                  className="block h-full rounded-full bg-amber-400"
                  style={{ width: `${(n / count) * 100}%` }}
                />
              </span>
              <span className="w-6 text-right tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-4 text-sm text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-800">
          How we calculate this
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>60% star rating</strong>, adjusted so an item with one 5-star
            review can&apos;t outrank one with twenty great reviews.
          </li>
          <li>
            <strong>25% condition</strong>, read by AI from what renters wrote
            (like new, good, worn or damaged).
          </li>
          <li>
            <strong>15% reliability</strong>: the share of rentals that finished
            with no problems reported.
          </li>
        </ul>
        <p className="mt-2">Scores update every night.</p>
      </details>
    </section>
  );
}
