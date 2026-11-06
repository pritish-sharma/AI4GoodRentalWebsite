"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/client-api";

const STAR_WORDS = ["", "Poor", "Fair", "Okay", "Good", "Great"];

export default function ReviewForm({
  rentalId,
  target,
  aboutName,
  token,
  onDone,
}: {
  rentalId: string;
  target: "item" | "user";
  /** Who or what is being reviewed, e.g. "the item" or "Maya". */
  aboutName: string;
  token: string;
  onDone: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stars) return setError("Pick 1 to 5 stars.");
    setBusy(true);
    setError(null);
    try {
      await apiRequest("/reviews", token, {
        method: "POST",
        body: { rental_id: rentalId, target, stars, text },
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-sm font-medium text-zinc-900">Review {aboutName}</p>
      <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => setStars(n)}
            className={`text-2xl leading-none ${n <= stars ? "text-amber-500" : "text-zinc-300 hover:text-amber-300"}`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm text-zinc-600">{STAR_WORDS[stars]}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={
          target === "item"
            ? "How was its condition? Did it match the listing? (This feeds the AI quality score.)"
            : "Were they easy to deal with? On time?"
        }
        className="input mt-2 text-sm"
      />
      {error && <p className="mt-1 text-sm text-rose-700">{error}</p>}
      <button
        disabled={busy}
        className="mt-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {busy ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}
