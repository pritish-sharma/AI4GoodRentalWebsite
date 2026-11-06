"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const MIN_PASSWORD = 8;

export default function LoginForm({ next, startOnSignup }: { next: string; startOnSignup: boolean }) {
  const router = useRouter();
  const { profile, profileError, signOut } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(startOnSignup ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  if (!supabase) return <SetupNeeded />;

  if (profile) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-900">You&apos;re logged in</h1>
        <p className="mt-2 text-zinc-600">as {profile.name} ({profile.email})</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={next} className="rounded-lg bg-zinc-900 px-5 py-2.5 text-white">
            Continue
          </Link>
          <button onClick={signOut} className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5">
            Log out
          </button>
        </div>
      </div>
    );
  }

  if (checkEmail) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Check your email</h1>
        <p className="mt-2 text-zinc-600">
          We sent a confirmation link to <strong>{email}</strong>. Click it, then come back and
          log in.
        </p>
        <button
          onClick={() => {
            setCheckEmail(false);
            setMode("login");
          }}
          className="mt-6 text-sm text-zinc-900 underline"
        >
          Back to log in
        </button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (mode === "signup") {
      if (!name.trim()) return setError("Please enter your name.");
      if (!cleanEmail.endsWith(".edu")) return setError("Please use your .edu school email.");
      if (password.length < MIN_PASSWORD)
        return setError(`Passwords need at least ${MIN_PASSWORD} characters.`);
    }

    setBusy(true);
    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: { data: { name: name.trim() } },
          })
        : await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    setBusy(false);

    if (result.error) {
      setError(friendlyAuthError(result.error.message));
      return;
    }
    if (!result.data.session) {
      // Supabase's "Confirm email" setting is on: no session until they click the link.
      setCheckEmail(true);
      return;
    }
    router.push(next);
  }

  const signup = mode === "signup";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-zinc-900">
        {signup ? "Create your account" : "Log in"}
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        {signup
          ? "Rent from and lend to students on your campus."
          : "Welcome back. Use your .edu email."}
      </p>

      {profileError && (
        <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{profileError}</p>
      )}

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
        {signup && (
          <Field label="Your name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="input"
              placeholder="First and last name"
            />
          </Field>
        )}
        <Field label="School email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="input"
            placeholder="netid@scarletmail.rutgers.edu"
          />
        </Field>
        <Field label="Password" hint={signup ? `At least ${MIN_PASSWORD} characters` : undefined}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signup ? "new-password" : "current-password"}
            className="input"
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">
            {error}
          </p>
        )}

        <button
          disabled={busy}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {busy ? "One moment…" : signup ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        {signup ? "Already have an account?" : "New here?"}{" "}
        <button
          onClick={() => {
            setMode(signup ? "login" : "signup");
            setError(null);
          }}
          className="font-medium text-zinc-900 underline"
        >
          {signup ? "Log in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-zinc-500">{hint}</span>}
    </label>
  );
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match.";
  if (m.includes("already registered")) return "That email already has an account. Try logging in.";
  if (m.includes("email not confirmed")) return "Confirm your email first: check your inbox for the link.";
  if (m.includes("rate limit")) return "Too many attempts. Wait a minute and try again.";
  return message;
}

function SetupNeeded() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <h1 className="text-xl font-bold">Login isn&apos;t set up yet</h1>
      <p className="mt-2 text-sm">
        Add your Supabase Project URL and anon key to <code>frontend/.env.local</code> as{" "}
        <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then
        restart <code>npm run dev</code>.
      </p>
    </div>
  );
}
