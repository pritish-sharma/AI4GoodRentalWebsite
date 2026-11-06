import { Suspense } from "react";
import EditListing from "./EditListing";

export const metadata = { title: "Edit listing · Campus Rentals" };

export default function EditItemPage({ params }: PageProps<"/items/[id]/edit">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        {params.then(({ id }) => (
          <EditListing id={id} />
        ))}
      </Suspense>
    </main>
  );
}
