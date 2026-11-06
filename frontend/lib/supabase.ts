import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-side Supabase client, used for logins and photo uploads only.
// All other data goes through our FastAPI backend.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** False until real values are in frontend/.env.local (see .env.example). */
export const supabaseConfigured =
  url.startsWith("http") && !url.includes("YOUR-PROJECT") && anonKey.length > 20;

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url, anonKey)
  : null;

export const PHOTO_BUCKET = "item-photos";
