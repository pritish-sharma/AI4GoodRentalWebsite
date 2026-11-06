import Link from "next/link";

export default function ItemNotFound() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-zinc-900">We couldn&apos;t find that item</h1>
      <p className="mt-2 text-zinc-600">It may have been removed by its owner.</p>
      <Link
        href="/items"
        className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white"
      >
        Browse all items
      </Link>
    </main>
  );
}
