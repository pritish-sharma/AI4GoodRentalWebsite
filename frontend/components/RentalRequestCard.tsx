"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/client-api";
import { daysBetween, formatRange } from "@/lib/dates";
import { useToday } from "@/lib/useToday";

const MAX_DAYS = 30; // matches backend/app/rental_rules.py

type Booked = { start_date: string; end_date: string };

export default function RentalRequestCard({
  itemId,
  ownerId,
  pricePerDay,
  booked,
  paused,
}: {
  itemId: string;
  ownerId: string;
  pricePerDay: number;
  booked: Booked[];
  paused: boolean;
}) {
  const { loading, profile, token } = useAuth();
  const pathname = usePathname();
  const today = useToday();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const days = start && end ? daysBetween(start, end) : null;
  const clash = start && end ? booked.find((b) => start <= b.end_date && b.start_date <= end) : undefined;
  const error =
    days === null
      ? null
      : today && start < today
        ? "Pick-up date is in the past"
        : days < 1
          ? "Return date is before pick-up"
          : days > MAX_DAYS
            ? `Rentals can be at most ${MAX_DAYS} days`
            : clash
              ? `Already booked ${formatRange(clash.start_date, clash.end_date)}`
              : null;

  const isOwner = profile?.id === ownerId;

  async function sendRequest() {
    if (!token || !days || error) return;
    setSending(true);
    setServerError(null);
    try {
      await apiRequest("/rentals", token, {
        method: "POST",
        body: { item_id: itemId, start_date: start, end_date: end },
      });
      setSent(true);
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="font-semibold text-emerald-900">Request sent</h2>
        <p className="mt-1 text-sm text-emerald-900">
          {formatRange(start, end)} · ${(days! * pricePerDay).toFixed(2)}. The owner will accept or
          decline it. You&apos;ll pay them in person at pickup.
        </p>
        <Link href="/rentals" className="mt-3 inline-block text-sm font-medium text-emerald-900 underline">
          See my rentals
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-2xl font-bold text-zinc-900">
        ${pricePerDay.toFixed(2)}
        <span className="text-base font-normal text-zinc-500"> / day</span>
      </p>

      {isOwner ? (
        <div className="mt-3 text-sm text-zinc-700">
          <p>This is your listing{paused && " (paused, so it's hidden from search)"}.</p>
          <div className="mt-3 flex gap-2">
            <Link
              href={`/items/${itemId}/edit`}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-center text-white hover:bg-zinc-700"
            >
              Edit listing
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-center hover:bg-zinc-50"
            >
              Requests
            </Link>
          </div>
        </div>
      ) : paused ? (
        <p className="mt-3 text-sm text-zinc-600">The owner has paused this listing for now.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm text-zinc-700">
              Pick up
              <input
                type="date"
                value={start}
                min={today}
                onChange={(e) => setStart(e.target.value)}
                className="input mt-1 px-2"
              />
            </label>
            <label className="text-sm text-zinc-700">
              Return
              <input
                type="date"
                value={end}
                min={start || today}
                onChange={(e) => setEnd(e.target.value)}
                className="input mt-1 px-2"
              />
            </label>
          </div>

          <div className="mt-3 min-h-6 text-sm" aria-live="polite">
            {error || serverError ? (
              <p className="text-rose-700">{error ?? serverError}</p>
            ) : days !== null ? (
              <p className="flex justify-between text-zinc-700">
                <span>
                  {days} day{days === 1 ? "" : "s"} × ${pricePerDay.toFixed(2)}
                </span>
                <span className="font-semibold text-zinc-900">${(days * pricePerDay).toFixed(2)}</span>
              </p>
            ) : null}
          </div>

          {loading ? (
            <div className="mt-3 h-11 rounded-lg bg-zinc-100" />
          ) : profile ? (
            <button
              onClick={sendRequest}
              disabled={!days || !!error || sending}
              className="mt-3 w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending…" : days ? "Request to rent" : "Pick your dates"}
            </button>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="mt-3 block rounded-lg bg-zinc-900 px-4 py-2.5 text-center font-medium text-white hover:bg-zinc-700"
            >
              Log in to request
            </Link>
          )}
          <p className="mt-2 text-center text-xs text-zinc-500">
            You won&apos;t be charged. Pay the owner at pickup.
          </p>

          {booked.length > 0 && (
            <div className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
              <p className="font-medium text-zinc-700">Already booked</p>
              <ul className="mt-1 space-y-0.5">
                {booked.map((b) => (
                  <li key={b.start_date}>{formatRange(b.start_date, b.end_date)}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
