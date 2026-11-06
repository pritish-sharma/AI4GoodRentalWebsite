"use client";

import Link from "next/link";
import { useState } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 30; // matches backend/app/rental_rules.py

// Both days count: Fri to Sun is 3 days. Dates are "YYYY-MM-DD" strings.
function rentalDays(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS) + 1;
}

export default function RentalRequestCard({ pricePerDay }: { pricePerDay: number }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const days = start && end ? rentalDays(start, end) : null;
  const error =
    days === null
      ? null
      : days < 1
        ? "End date is before start date"
        : days > MAX_DAYS
          ? `Rentals can be at most ${MAX_DAYS} days`
          : null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-2xl font-bold text-zinc-900">
        ${pricePerDay.toFixed(2)}
        <span className="text-base font-normal text-zinc-500"> / day</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-sm text-zinc-700">
          Pick up
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5"
          />
        </label>
        <label className="text-sm text-zinc-700">
          Return
          <input
            type="date"
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5"
          />
        </label>
      </div>

      <div className="mt-3 min-h-6 text-sm" aria-live="polite">
        {error ? (
          <p className="text-rose-700">{error}</p>
        ) : days !== null ? (
          <p className="flex justify-between text-zinc-700">
            <span>
              {days} day{days === 1 ? "" : "s"} × ${pricePerDay.toFixed(2)}
            </span>
            <span className="font-semibold text-zinc-900">
              ${(days * pricePerDay).toFixed(2)}
            </span>
          </p>
        ) : null}
      </div>

      {/* Sending the request needs a logged-in user; wire this up once /login exists. */}
      <Link
        href="/login"
        className="mt-3 block rounded-lg bg-zinc-900 px-4 py-2.5 text-center font-medium text-white hover:bg-zinc-700"
      >
        Log in to request
      </Link>
      <p className="mt-2 text-center text-xs text-zinc-500">
        You won&apos;t be charged. Pay the owner at pickup.
      </p>
    </section>
  );
}
