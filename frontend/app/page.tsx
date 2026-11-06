import Link from "next/link";
import { Suspense } from "react";
import BackendDown from "@/components/BackendDown";
import ItemGrid from "@/components/ItemGrid";
import { getPopularItems } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";

// Fetches "Trending this week" from the backend (AI feature #1).
async function TrendingItems() {
  // Fetch first, then render, so errors are handled outside the JSX.
  const items = await getPopularItems().catch(() => null);

  if (items === null) return <BackendDown />;
  if (items.length === 0) {
    return (
      <p className="text-zinc-500">
        No items yet. Run the seed script in /backend to load demo data.
      </p>
    );
  }
  return <ItemGrid items={items} />;
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <section className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900">
          Rent it for a few days instead of buying it.
        </h1>
        <p className="mt-2 text-zinc-600">
          Cameras, camping gear, tools and more from students on campus.
        </p>
        <form action="/items" className="mt-6 flex gap-2">
          <input
            name="q"
            placeholder="What do you need? Try “camera”"
            aria-label="Search items"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2"
          />
          <button className="rounded-lg bg-zinc-900 px-5 py-2 text-white">
            Search
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/items?category=${encodeURIComponent(c)}`}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">Trending this week</h2>
          <Link href="/items" className="text-sm text-zinc-600 hover:text-zinc-900">
            See all →
          </Link>
        </div>
        <Suspense fallback={<p className="text-zinc-500">Loading trending items…</p>}>
          <TrendingItems />
        </Suspense>
      </section>
    </main>
  );
}
