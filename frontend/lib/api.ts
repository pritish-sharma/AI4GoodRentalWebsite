// Small helper for calling the FastAPI backend.
// Set NEXT_PUBLIC_API_URL in frontend/.env.local (see .env.example).

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Item = {
  id: string;
  title: string;
  category: string;
  price_per_day: number;
  photo_url: string | null;
  quality_score: number | null;
  quality_label: string | null;
};

export async function getPopularItems(category?: string): Promise<Item[]> {
  const url = new URL("/recommendations/popular", API_URL);
  if (category) url.searchParams.set("category", category);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Backend returned ${res.status} for ${url.pathname}`);
  }
  return res.json();
}
