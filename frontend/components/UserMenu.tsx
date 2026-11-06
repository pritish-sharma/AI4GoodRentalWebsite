"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function UserMenu() {
  const { loading, profile, signOut } = useAuth();
  const router = useRouter();

  if (loading) return <span className="w-16" aria-hidden />;

  if (!profile) {
    return (
      <Link href="/login" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-700">
        Log in
      </Link>
    );
  }

  return (
    <>
      <Link href="/rentals" className="hover:text-zinc-900">My rentals</Link>
      <Link href="/dashboard" className="hover:text-zinc-900">My listings</Link>
      <Link
        href={`/users/${profile.id}`}
        className="flex items-center gap-2 hover:text-zinc-900"
        title="Your public profile"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
          {profile.name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{profile.name.split(" ")[0]}</span>
      </Link>
      <button
        onClick={async () => {
          await signOut();
          router.push("/");
        }}
        className="text-zinc-500 hover:text-zinc-900"
      >
        Log out
      </button>
    </>
  );
}
