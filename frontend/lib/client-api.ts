// Calls to the backend that need the logged-in user's token.
// Used from Client Components ("use client") only.

import { API_URL } from "./api";

export class RequestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// FastAPI errors look like {"detail": "text"} or, for invalid input,
// {"detail": [{"msg": "...", "loc": [...]}]}.
function messageFrom(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) {
    const field = detail[0].loc?.at(-1);
    return field ? `${field}: ${detail[0].msg}` : detail[0].msg;
  }
  return status >= 500 ? "Something went wrong on our side. Try again." : `Request failed (${status})`;
}

export async function apiRequest<T>(
  path: string,
  token: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(new URL(path, API_URL), {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body !== undefined && { "Content-Type": "application/json" }),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new RequestError(0, "Can't reach the backend. Is it running?");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new RequestError(res.status, messageFrom(body, res.status));
  return body as T;
}

// ---- Types for logged-in pages ----

export type RentalStatus = "requested" | "accepted" | "declined" | "active" | "returned" | "cancelled";

export type Rental = {
  id: string;
  item_id: string;
  start_date: string;
  end_date: string;
  status: RentalStatus;
  total_price: number;
  created_at: string;
  item_title: string;
  item_photo: string | null;
  owner_id: string;
  owner_name: string;
  renter_id: string;
  renter_name: string;
  my_reviews: ("item" | "user")[];
};

export type MyListing = {
  id: string;
  title: string;
  category: string;
  price_per_day: number;
  photo_url: string | null;
  status: "active" | "paused";
  quality_score: number | null;
  quality_label: string | null;
  pending_requests: number;
  times_rented: number;
};
