import Link from "next/link";
import { Suspense } from "react";
import BackendDown from "@/components/BackendDown";
import ItemGrid from "@/components/ItemGrid";
import { searchItems, type SortOption } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";

const SORTS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "quality", label: "Best quality" },
  { value: "price", label: "Lowest price" },
];

type Filters = { q?: string; category?: string; sort: SortOption };

function readFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const sort = one(sp.sort);
  return {
    q: one(sp.q)?.trim() || undefined,
    category: CATEGORIES.includes(one(sp.category) ?? "") ? one(sp.category) : undefined,
    sort: SORTS.some((s) => s.value === sort) ? (sort as SortOption) : "newest",
  };
}

// Builds a /items link that keeps the current filters and changes one.
function hrefWith(f: Filters, change: Partial<Filters>): string {
  const next = { ...f, ...change };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.sort !== "newest") params.set("sort", next.sort);
  const qs = params.toString();
  return qs ? `/items?${qs}` : "/items";
}

// Search params are request-time data, so they're read inside <Suspense>.
export default function BrowsePage({ searchParams }: PageProps<"/items">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-900">Browse items</h1>
      <Suspense fallback={<p className="mt-6 text-zinc-500">Loading items…</p>}>
        {searchParams.then((sp) => (
          <Results filters={readFilters(sp)} />
        ))}
      </Suspense>
    </main>
  );
}

async function Results({ filters }: { filters: Filters }) {
  const items = await searchItems(filters).catch(() => null);

  return (
    <>
      <form action="/items" className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search items, e.g. “tent”"
          aria-label="Search items"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2"
        />
        {filters.category && <input type="hidden" name="category" value={filters.category} />}
        {filters.sort !== "newest" && <input type="hidden" name="sort" value={filters.sort} />}
        <button className="rounded-lg bg-zinc-900 px-5 py-2 text-white">Search</button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Chip href={hrefWith(filters, { category: undefined })} active={!filters.category}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} href={hrefWith(filters, { category: c })} active={filters.category === c}>
            {c}
          </Chip>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <p className="text-sm text-zinc-600" aria-live="polite">
          {items === null ? "" : `${items.length} item${items.length === 1 ? "" : "s"}`}
          {filters.q && <> for “{filters.q}”</>}
        </p>
        <nav className="flex gap-1 text-sm" aria-label="Sort">
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={hrefWith(filters, { sort: s.value })}
              aria-current={filters.sort === s.value ? "true" : undefined}
              className={`rounded-md px-3 py-1 ${
                filters.sort === s.value
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {items === null ? (
          <BackendDown />
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-zinc-700">No items match that search.</p>
            <Link href="/items" className="mt-2 inline-block text-sm text-zinc-900 underline">
              Clear filters
            </Link>
          </div>
        ) : (
          <ItemGrid items={items} />
        )}
      </div>
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full border px-3 py-1 text-sm ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}
