import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import BackendDown from "@/components/BackendDown";
import ItemGrid from "@/components/ItemGrid";
import QualityBreakdown from "@/components/QualityBreakdown";
import RentalRequestCard from "@/components/RentalRequestCard";
import { getItem, getSimilarItems, type Review } from "@/lib/api";

// The id comes from the URL, so it's only known at request time.
// Next.js requires runtime data like this to sit inside <Suspense>.
export default function ItemPage({ params }: PageProps<"/items/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Back to home
      </Link>
      <Suspense fallback={<ItemSkeleton />}>
        {params.then(({ id }) => (
          <ItemDetails id={id} />
        ))}
      </Suspense>
    </main>
  );
}

async function ItemDetails({ id }: { id: string }) {
  const item = await getItem(id).catch(() => undefined);
  if (item === undefined) return <div className="mt-6"><BackendDown /></div>;
  if (item === null) notFound();

  return (
    <>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
            {item.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photos[0]} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-400">
                No photo yet
              </div>
            )}
          </div>

          <p className="mt-6 text-xs uppercase tracking-wide text-zinc-500">{item.category}</p>
          <h1 className="mt-1 text-3xl font-bold text-zinc-900">{item.title}</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Listed by <span className="font-medium text-zinc-900">{item.owner_name}</span>
            {" · "}Condition (per owner): {item.condition_stated}
          </p>
          {item.description && <p className="mt-4 text-zinc-700">{item.description}</p>}

          <Reviews reviews={item.reviews} />
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <RentalRequestCard pricePerDay={item.price_per_day} />
          <QualityBreakdown
            score={item.quality_score}
            label={item.quality_label}
            reviews={item.reviews}
          />
        </aside>
      </div>

      <Suspense fallback={null}>
        <SimilarItems id={item.id} />
      </Suspense>
    </>
  );
}

function Reviews({ reviews }: { reviews: Review[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-zinc-900">
        Reviews <span className="text-zinc-500">({reviews.length})</span>
      </h2>
      {reviews.length === 0 ? (
        <p className="mt-3 text-zinc-600">No reviews yet. Be the first to rent it.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-200">
          {reviews.map((r, i) => (
            <li key={i} className="py-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-amber-500" aria-label={`${r.stars} out of 5 stars`}>
                  {"★".repeat(r.stars)}
                  <span className="text-zinc-300">{"★".repeat(5 - r.stars)}</span>
                </span>
                <span className="font-medium text-zinc-900">{r.reviewer_name}</span>
                <span className="text-sm text-zinc-500">{formatDate(r.created_at)}</span>
              </div>
              {r.text && <p className="mt-1 text-zinc-700">{r.text}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// AI feature 3: items rented by the same people (backend/app/ai/similar.py).
async function SimilarItems({ id }: { id: string }) {
  const items = await getSimilarItems(id).catch(() => []);
  if (items.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-zinc-900">Others also rented</h2>
      <p className="mb-4 mt-1 text-sm text-zinc-600">
        Picked by our recommender from what other students rented together.
      </p>
      <ItemGrid items={items} />
    </section>
  );
}

function ItemSkeleton() {
  return (
    <div className="mt-4 grid animate-pulse gap-8 lg:grid-cols-[1fr_360px]" aria-hidden>
      <div>
        <div className="aspect-[4/3] rounded-xl bg-zinc-200" />
        <div className="mt-6 h-8 w-2/3 rounded bg-zinc-200" />
        <div className="mt-3 h-4 w-1/3 rounded bg-zinc-200" />
      </div>
      <div className="h-64 rounded-xl bg-zinc-200" />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
