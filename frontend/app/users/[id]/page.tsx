import { notFound } from "next/navigation";
import { Suspense } from "react";
import BackendDown from "@/components/BackendDown";
import ItemGrid from "@/components/ItemGrid";
import { getProfile } from "@/lib/api";

export default function ProfilePage({ params }: PageProps<"/users/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        {params.then(({ id }) => (
          <Profile id={id} />
        ))}
      </Suspense>
    </main>
  );
}

async function Profile({ id }: { id: string }) {
  const person = await getProfile(id).catch(() => undefined);
  if (person === undefined) return <BackendDown />;
  if (person === null) notFound();

  const joined = new Date(person.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-2xl font-semibold text-white">
          {person.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">{person.name}</h1>
          <p className="text-sm text-zinc-600">Member since {joined}</p>
        </div>
      </div>

      <dl className="mt-6 grid max-w-lg grid-cols-3 gap-3">
        <Stat label="Rating" value={person.avg_rating !== null ? `${person.avg_rating.toFixed(1)} ★` : "—"} />
        <Stat label="Reviews" value={String(person.review_count)} />
        <Stat label="Rentals done" value={String(person.rentals_completed)} />
      </dl>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Listings <span className="text-zinc-500">({person.listings.length})</span>
        </h2>
        {person.listings.length === 0 ? (
          <p className="text-zinc-600">Nothing listed right now.</p>
        ) : (
          <ItemGrid items={person.listings} />
        )}
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-xl font-semibold text-zinc-900">What others say</h2>
        {person.reviews.length === 0 ? (
          <p className="mt-3 text-zinc-600">No reviews yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200">
            {person.reviews.map((r, i) => (
              <li key={i} className="py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-amber-500" aria-label={`${r.stars} out of 5 stars`}>
                    {"★".repeat(r.stars)}
                    <span className="text-zinc-300">{"★".repeat(5 - r.stars)}</span>
                  </span>
                  <span className="font-medium text-zinc-900">{r.reviewer_name}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                    as {r.as_role === "owner" ? "an owner" : "a renter"}
                  </span>
                </div>
                {r.text && <p className="mt-1 text-zinc-700">{r.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-zinc-900">{value}</dd>
    </div>
  );
}
