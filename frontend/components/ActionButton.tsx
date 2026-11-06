"use client";

import { useState } from "react";

type Props = {
  /** Runs the action; throw an Error to show its message. */
  onClick: () => Promise<void>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  /** For actions that can't be undone: asks "Are you sure?" inline first. */
  confirm?: string;
};

const VARIANTS = {
  primary: "bg-zinc-900 text-white hover:bg-zinc-700",
  secondary: "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
  danger: "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
};

export default function ActionButton({ onClick, children, variant = "secondary", confirm }: Props) {
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setAsking(false);
    setBusy(true);
    setError(null);
    try {
      await onClick();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const base = "rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50";
  return (
    <span className="inline-flex flex-col items-start gap-1">
      {asking ? (
        <span className="inline-flex items-center gap-2 text-sm">
          <span className="text-zinc-700">{confirm}</span>
          <button onClick={run} className={`${base} ${VARIANTS.danger}`}>Yes</button>
          <button onClick={() => setAsking(false)} className={`${base} ${VARIANTS.secondary}`}>No</button>
        </span>
      ) : (
        <button
          onClick={confirm ? () => setAsking(true) : run}
          disabled={busy}
          className={`${base} ${VARIANTS[variant]}`}
        >
          {busy ? "…" : children}
        </button>
      )}
      {error && <span className="text-xs text-rose-700">{error}</span>}
    </span>
  );
}
