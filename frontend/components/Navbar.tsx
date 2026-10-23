import Link from "next/link";

// Placeholder name: rename once the group picks one.
export default function Navbar() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-zinc-900">
          Campus Rentals
        </Link>
        <div className="flex items-center gap-4 text-sm text-zinc-700">
          <Link href="/items">Browse</Link>
          <Link href="/items/new">List an item</Link>
          <Link href="/rentals">My rentals</Link>
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-white"
          >
            Log in
          </Link>
        </div>
      </nav>
    </header>
  );
}
