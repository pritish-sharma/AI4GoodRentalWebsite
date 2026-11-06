"use client";

import Link from "next/link";
import ItemForm from "@/components/ItemForm";
import RequireLogin from "@/components/RequireLogin";
import type { ItemDetail } from "@/lib/api";
import { useApiData } from "@/lib/useApiData";

export default function EditListing({ id }: { id: string }) {
  return (
    <RequireLogin what="this listing">
      {({ token, userId }) => <Editor id={id} token={token} userId={userId} />}
    </RequireLogin>
  );
}

function Editor({ id, token, userId }: { id: string; token: string; userId: string }) {
  const { data: item, error, loading } = useApiData<ItemDetail>(`/items/${encodeURIComponent(id)}`, token);

  if (loading) return <p className="text-zinc-500">Loading…</p>;
  if (error || !item) return <p className="text-rose-700">{error ?? "Item not found"}</p>;
  if (item.owner_id !== userId) {
    return (
      <div className="py-12 text-center">
        <p className="text-zinc-700">You can only edit your own listings.</p>
        <Link href={`/items/${id}`} className="mt-3 inline-block underline">Back to the item</Link>
      </div>
    );
  }

  return (
    <>
      <Link href={`/items/${id}`} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Back to listing
      </Link>
      <h1 className="mb-8 mt-2 text-3xl font-bold text-zinc-900">Edit listing</h1>
      <ItemForm
        token={token}
        userId={userId}
        itemId={id}
        initial={{
          title: item.title,
          description: item.description,
          category: item.category,
          price_per_day: item.price_per_day.toFixed(2),
          condition_stated: item.condition_stated,
          photos: item.photos,
        }}
      />
    </>
  );
}
