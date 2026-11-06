"use client";

import Link from "next/link";
import { useState } from "react";
import ActionButton from "@/components/ActionButton";
import QualityBadge from "@/components/QualityBadge";
import RentalRow from "@/components/RentalRow";
import RequireLogin from "@/components/RequireLogin";
import ReviewForm from "@/components/ReviewForm";
import { apiRequest, type MyListing, type Rental } from "@/lib/client-api";
import { formatDay } from "@/lib/dates";
import { useApiData } from "@/lib/useApiData";

export default function Dashboard() {
  return (
    <RequireLogin what="your listings">
      {({ token }) => <OwnerDashboard token={token} />}
    </RequireLogin>
  );
}

function OwnerDashboard({ token }: { token: string }) {
  const requests = useApiData<Rental[]>("/rentals?role=owner", token);
  const listings = useApiData<MyListing[]>("/me/items", token);

  const reloadAll = () => {
    requests.reload();
    listings.reload();
  };
  const setStatus = (id: string, status: string) => async () => {
    await apiRequest(`/rentals/${id}`, token, { method: "PATCH", body: { status } });
    reloadAll();
  };

  const rentals = requests.data ?? [];
  const groups = [
    {
      title: "Needs your answer",
      rows: rentals.filter((r) => r.status === "requested"),
      actions: (r: Rental) => (
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={setStatus(r.id, "accepted")} variant="primary">Accept</ActionButton>
          <ActionButton onClick={setStatus(r.id, "declined")} variant="danger" confirm="Decline?">
            Decline
          </ActionButton>
        </div>
      ),
    },
    {
      title: "Upcoming pickups",
      rows: rentals.filter((r) => r.status === "accepted"),
      actions: (r: Rental) => (
        <Handoff
          hint={`Meet ${r.renter_name} on ${formatDay(r.start_date)}. Collect $${r.total_price.toFixed(2)}.`}
        >
          <ActionButton onClick={setStatus(r.id, "active")} variant="primary">Mark picked up</ActionButton>
        </Handoff>
      ),
    },
    {
      title: "Out with renters",
      rows: rentals.filter((r) => r.status === "active"),
      actions: (r: Rental) => (
        <Handoff hint={`Due back ${formatDay(r.end_date)}.`}>
          <ActionButton onClick={setStatus(r.id, "returned")} variant="primary">Mark returned</ActionButton>
        </Handoff>
      ),
    },
    {
      title: "Past",
      rows: rentals.filter((r) => ["returned", "declined", "cancelled"].includes(r.status)),
      actions: (r: Rental) =>
        r.status === "returned" ? <ReviewRenter rental={r} token={token} onDone={requests.reload} /> : null,
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">My listings</h1>
          <p className="mt-1 text-zinc-600">Requests for your items, and the items themselves.</p>
        </div>
        <Link href="/items/new" className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700">
          + List an item
        </Link>
      </div>

      {requests.error && <p className="mt-6 rounded-lg bg-amber-50 p-4 text-amber-900">{requests.error}</p>}
      {requests.loading ? (
        <p className="mt-8 text-zinc-500">Loading requests…</p>
      ) : (
        groups
          .filter((g) => g.rows.length > 0)
          .map((g) => (
            <section key={g.title} className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                {g.title} <span className="text-zinc-400">({g.rows.length})</span>
              </h2>
              <ul className="flex flex-col gap-3">
                {g.rows.map((r) => (
                  <RentalRow key={r.id} rental={r} ownerView>
                    {g.actions(r)}
                  </RentalRow>
                ))}
              </ul>
            </section>
          ))
      )}
      {!requests.loading && rentals.length === 0 && (
        <p className="mt-8 text-zinc-600">No rental requests yet. They&apos;ll show up here.</p>
      )}

      <section className="mt-12">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Your items</h2>
        {listings.loading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : (listings.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center">
            <p className="text-zinc-700">You haven&apos;t listed anything yet.</p>
            <p className="mt-1 text-sm text-zinc-500">Got a tent, camera or speaker you rarely use?</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {listings.data!.map((item) => (
              <ListingRow key={item.id} item={item} token={token} onChange={listings.reload} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Handoff({ hint, children }: { hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-zinc-700">{hint}</p>
      {children}
    </div>
  );
}

function ReviewRenter({ rental, token, onDone }: { rental: Rental; token: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  if (rental.my_reviews.includes("user")) {
    return <p className="text-sm text-emerald-700">✓ You reviewed {rental.renter_name}</p>;
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
      >
        ★ Review {rental.renter_name}
      </button>
    );
  }
  return (
    <ReviewForm rentalId={rental.id} target="user" aboutName={rental.renter_name} token={token} onDone={onDone} />
  );
}

function ListingRow({ item, token, onChange }: { item: MyListing; token: string; onChange: () => void }) {
  const paused = item.status === "paused";
  const toggle = async () => {
    await apiRequest(`/items/${item.id}`, token, {
      method: "PATCH",
      body: { status: paused ? "active" : "paused" },
    });
    onChange();
  };

  return (
    <li className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-3">
      <Link href={`/items/${item.id}`} className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
        {item.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-zinc-400">No photo</span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/items/${item.id}`} className="font-semibold text-zinc-900 hover:underline">
            {item.title}
          </Link>
          {paused && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">Paused</span>
          )}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          ${item.price_per_day.toFixed(2)}/day
          <QualityBadge score={item.quality_score} label={item.quality_label} />
        </p>
        <p className="text-xs text-zinc-500">
          Rented {item.times_rented} time{item.times_rented === 1 ? "" : "s"}
          {item.pending_requests > 0 && (
            <span className="font-medium text-amber-700"> · {item.pending_requests} waiting</span>
          )}
        </p>
        <div className="mt-2 flex gap-2">
          <Link
            href={`/items/${item.id}/edit`}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
          >
            Edit
          </Link>
          <ActionButton onClick={toggle}>{paused ? "Resume" : "Pause"}</ActionButton>
        </div>
      </div>
    </li>
  );
}
