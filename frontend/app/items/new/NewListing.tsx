"use client";

import ItemForm from "@/components/ItemForm";
import RequireLogin from "@/components/RequireLogin";

export default function NewListing() {
  return (
    <RequireLogin what="the listing form">
      {({ token, userId }) => (
        <>
          <h1 className="text-3xl font-bold text-zinc-900">List an item</h1>
          <p className="mb-8 mt-1 text-zinc-600">
            Earn a little from things you&apos;re not using. Renters pay you in person.
          </p>
          <ItemForm token={token} userId={userId} />
        </>
      )}
    </RequireLogin>
  );
}
