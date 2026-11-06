import NewListing from "./NewListing";

export const metadata = { title: "List an item · Campus Rentals" };

export default function NewItemPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <NewListing />
    </main>
  );
}
