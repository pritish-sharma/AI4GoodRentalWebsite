import Link from "next/link";
import UserMenu from "./UserMenu";

// Placeholder name: rename once the group picks one.
export default function Navbar() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-zinc-900">
          Campus Rentals
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-700">
          <Link href="/items" className="hover:text-zinc-900">Browse</Link>
          <Link href="/items/new" className="hover:text-zinc-900">List an item</Link>
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}
