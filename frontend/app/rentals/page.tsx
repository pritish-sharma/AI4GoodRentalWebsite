import MyRentals from "./MyRentals";

export const metadata = { title: "My rentals · Campus Rentals" };

export default function RentalsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <MyRentals />
    </main>
  );
}
