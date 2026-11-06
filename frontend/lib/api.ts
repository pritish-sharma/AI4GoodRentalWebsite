// Small helpers for calling the FastAPI backend.
// Set NEXT_PUBLIC_API_URL in frontend/.env.local (see .env.example).

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// What a card needs (home page, browse page, "Others also rented").
export type Item = {
  id: string;
  title: string;
  category: string;
  price_per_day: number;
  photo_url: string | null;
  quality_score: number | null;
  quality_label: string | null;
};

export type Review = {
  stars: number;
  text: string;
  created_at: string;
  reviewer_name: string;
};

// Everything the item detail page shows.
export type ItemDetail = {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  description: string;
  category: string;
  price_per_day: number;
  condition_stated: "like new" | "good" | "worn";
  photos: string[];
  status: "active" | "paused";
  created_at: string;
  quality_score: number | null;
  quality_label: string | null;
  reviews: Review[];
  booked: { start_date: string; end_date: string }[];
};

export type SortOption = "newest" | "quality" | "price";

async function getJSON<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(path, API_URL);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) url.searchParams.set(key, value);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError(res.status, `Backend returned ${res.status} for ${url.pathname}`);
  }
  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getPopularItems(category?: string): Promise<Item[]> {
  return getJSON("/recommendations/popular", { category });
}

export function searchItems(opts: { q?: string; category?: string; sort?: SortOption }): Promise<Item[]> {
  return getJSON("/items", opts);
}

/** Returns null when the item doesn't exist, so the page can show a 404. */
export async function getItem(id: string): Promise<ItemDetail | null> {
  try {
    return await getJSON<ItemDetail>(`/items/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 422)) return null;
    throw err;
  }
}

export function getSimilarItems(id: string): Promise<Item[]> {
  return getJSON(`/recommendations/similar/${encodeURIComponent(id)}`);
}

export type ProfileReview = Review & { as_role: "owner" | "renter" };

export type PublicProfile = {
  id: string;
  name: string;
  created_at: string;
  avg_rating: number | null;
  review_count: number;
  rentals_completed: number;
  reviews: ProfileReview[];
  listings: Item[];
};

/** Returns null when the person doesn't exist. */
export async function getProfile(id: string): Promise<PublicProfile | null> {
  try {
    return await getJSON<PublicProfile>(`/users/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 422)) return null;
    throw err;
  }
}
