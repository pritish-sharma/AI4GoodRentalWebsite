import { Suspense } from "react";
import ItemCard from "@/components/ItemCard";
import { getPopularItems } from "@/lib/api";

const CATEGORIES = ["Cameras", "Outdoor", "Gardening", "Beauty", "Tech", "Other"];

// Fetches "Trending this week" from the backend (AI feature #1).
async function TrendingItems() {
  // Fetch first, then render, so errors are handled outside the JSX.
  const items = await getPopularItems().catch(() => null);

  if (items === null) {
    return (
      <p className="rounded-lg bg-amber-50 p-4 text-amber-900">
        Can&apos;t reach the backend. Start it with{" "}
        <code className="font-mono">uvicorn app.main:app --reload</code> in
        /backend.
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <p className="text-zinc-500">
        No items yet. Run the seed script in /backend to load demo data.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
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
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2"
          />
          <button className="rounded-lg bg-zinc-900 px-5 py-2 text-white">
            Search
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <a
              key={c}
              href={`/items?category=${encodeURIComponent(c)}`}
              className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              {c}
            </a>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Trending this week
        </h2>
        <Suspense fallback={<p className="text-zinc-500">Loading trending items…</p>}>
          <TrendingItems />
        </Suspense>
      </section>
    </main>
  );
}
