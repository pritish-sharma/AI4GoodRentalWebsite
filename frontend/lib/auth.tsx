"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest } from "./client-api";
import { supabase } from "./supabase";

type Profile = { id: string; email: string; name: string };

type AuthState = {
  /** True until we know whether someone is logged in. */
  loading: boolean;
  session: Session | null;
  /** Our own `users` row; null until POST /me has succeeded. */
  profile: Profile | null;
  /** Set if the profile couldn't be created (e.g. not a .edu email). */
  profileError: string | null;
  token: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionKnown, setSessionKnown] = useState(!supabase);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<{ userId: string; message: string } | null>(null);

  // Supabase keeps the login in the browser and tells us when it changes.
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSessionKnown(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // After every login, make sure the backend has a `users` row for this person.
  const userId = session?.user.id;
  const token = session?.access_token ?? null;
  const email = session?.user.email ?? "";
  const metaName = (session?.user.user_metadata?.name as string | undefined) ?? "";
  useEffect(() => {
    if (!userId || !token) return;
    let cancelled = false;
    const name = metaName.trim() || email.split("@")[0];
    apiRequest<Profile>("/me", token, { method: "POST", body: { email, name } })
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setProfileError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setProfile(null);
        setProfileError({ userId, message: err.message });
      });
    return () => {
      cancelled = true;
    };
    // Re-run only when a different person logs in, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setProfile(null);
    setProfileError(null);
  }, []);

  // Ignore a profile left over from a previous login.
  const currentProfile = profile && profile.id === userId ? profile : null;
  const currentError = profileError && profileError.userId === userId ? profileError.message : null;
  const loading = !sessionKnown || (!!session && !currentProfile && !currentError);
  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        profile: currentProfile,
        profileError: currentError,
        token,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
