"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

// Wraps pages that only make sense when logged in (My rentals, dashboard...).
// Renders children with the user's token once login and profile are ready.
export default function RequireLogin({
  children,
  what,
}: {
  children: (auth: { token: string; userId: string }) => React.ReactNode;
  what: string;
}) {
  const { loading, profile, profileError, token, signOut } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <p className="py-12 text-center text-zinc-500">Loading…</p>;
  }
  if (profileError) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="text-rose-700">{profileError}</p>
        <button onClick={signOut} className="mt-4 text-sm text-zinc-900 underline">
          Log out and try another account
        </button>
      </div>
    );
  }
  if (!profile || !token) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Log in to see {what}</h1>
        <p className="mt-2 text-zinc-600">You&apos;ll need your .edu email.</p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-white"
        >
          Log in or sign up
        </Link>
      </div>
    );
  }
  return <>{children({ token, userId: profile.id })}</>;
}
