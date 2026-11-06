"use client";

import Link from "next/link";
import { useState } from "react";
import ActionButton from "@/components/ActionButton";
import RentalRow from "@/components/RentalRow";
import RequireLogin from "@/components/RequireLogin";
import ReviewForm from "@/components/ReviewForm";
import { apiRequest, type Rental } from "@/lib/client-api";
import { formatDay } from "@/lib/dates";
import { useApiData } from "@/lib/useApiData";

export default function MyRentals() {
  return (
    <RequireLogin what="your rentals">
      {({ token }) => <RentalsList token={token} />}
    </RequireLogin>
  );
}

const CURRENT = new Set(["requested", "accepted", "active"]);

function RentalsList({ token }: { token: string }) {
  const { data, error, loading, reload } = useApiData<Rental[]>("/rentals?role=renter", token);

  const setStatus = (id: string, status: string) => async () => {
    await apiRequest(`/rentals/${id}`, token, { method: "PATCH", body: { status } });
    reload();
  };

  if (loading) return <p className="text-zinc-500">Loading your rentals…</p>;
  if (error) return <p className="rounded-lg bg-amber-50 p-4 text-amber-900">{error}</p>;

  const rentals = data ?? [];
  const current = rentals.filter((r) => CURRENT.has(r.status));
  const past = rentals.filter((r) => !CURRENT.has(r.status));

  return (
    <>
      <h1 className="text-3xl font-bold text-zinc-900">My rentals</h1>
      <p className="mt-1 text-zinc-600">Things you&apos;ve asked to borrow.</p>

      {rentals.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-zinc-300 p-10 text-center">
          <p className="text-zinc-700">You haven&apos;t rented anything yet.</p>
          <Link href="/items" className="mt-3 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white">
            Browse items
          </Link>
        </div>
      )}

      {current.length > 0 && (
        <Section title="Current">
          {current.map((r) => (
            <RentalRow key={r.id} rental={r}>
              <CurrentActions rental={r} cancel={setStatus(r.id, "cancelled")} />
            </RentalRow>
          ))}
        </Section>
      )}

      {past.length > 0 && (
        <Section title="Past">
          {past.map((r) => (
            <RentalRow key={r.id} rental={r}>
              {r.status === "returned" && <ReviewPrompts rental={r} token={token} onDone={reload} />}
            </RentalRow>
          ))}
        </Section>
      )}
    </>
  );
}

function CurrentActions({ rental, cancel }: { rental: Rental; cancel: () => Promise<void> }) {
  const hint = {
    requested: `${rental.owner_name} will accept or decline your request.`,
    accepted: `Meet ${rental.owner_name} in a public spot on campus on ${formatDay(rental.start_date)}. Pay $${rental.total_price.toFixed(2)} at pickup.`,
    active: `Return it to ${rental.owner_name} by ${formatDay(rental.end_date)}.`,
  }[rental.status as "requested" | "accepted" | "active"];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-zinc-700">{hint}</p>
      {rental.status !== "active" && (
        <ActionButton onClick={cancel} variant="danger" confirm="Cancel this request?">
          Cancel
        </ActionButton>
      )}
    </div>
  );
}

function ReviewPrompts({ rental, token, onDone }: { rental: Rental; token: string; onDone: () => void }) {
  const [open, setOpen] = useState<"item" | "user" | null>(null);
  const todo = (["item", "user"] as const).filter((t) => !rental.my_reviews.includes(t));

  if (todo.length === 0) return <p className="text-sm text-emerald-700">✓ Thanks for your reviews</p>;

  const label = (t: "item" | "user") => (t === "item" ? "the item" : rental.owner_name);
  return (
    <div>
      {open ? (
        <ReviewForm
          rentalId={rental.id}
          target={open}
          aboutName={label(open)}
          token={token}
          onDone={() => {
            setOpen(null);
            onDone();
          }}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {todo.map((t) => (
            <button
              key={t}
              onClick={() => setOpen(t)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
            >
              ★ Review {label(t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <ul className="flex flex-col gap-3">{children}</ul>
    </section>
  );
}
