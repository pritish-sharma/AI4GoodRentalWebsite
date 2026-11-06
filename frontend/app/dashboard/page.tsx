import Dashboard from "./Dashboard";

export const metadata = { title: "My listings · Campus Rentals" };

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <Dashboard />
    </main>
  );
}
