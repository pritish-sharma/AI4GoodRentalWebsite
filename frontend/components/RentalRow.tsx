import Link from "next/link";
import type { Rental } from "@/lib/client-api";
import { daysBetween, formatRange } from "@/lib/dates";
import StatusPill from "./StatusPill";

// One rental in a list. The page passes in the buttons that fit the viewer.
export default function RentalRow({
  rental,
  ownerView = false,
  children,
}: {
  rental: Rental;
  ownerView?: boolean;
  children?: React.ReactNode;
}) {
  const days = daysBetween(rental.start_date, rental.end_date);
  const other = ownerView
    ? { label: "Renter", id: rental.renter_id, name: rental.renter_name }
    : { label: "Owner", id: rental.owner_id, name: rental.owner_name };
  const faded = rental.status === "declined" || rental.status === "cancelled";

  return (
    <li className={`flex gap-4 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 ${faded ? "opacity-70" : ""}`}>
      <Link href={`/items/${rental.item_id}`} className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
        {rental.item_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rental.item_photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-zinc-400">No photo</span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Link href={`/items/${rental.item_id}`} className="font-semibold text-zinc-900 hover:underline">
            {rental.item_title}
          </Link>
          <StatusPill status={rental.status} ownerView={ownerView} />
        </div>
        <p className="mt-0.5 text-sm text-zinc-600">
          {formatRange(rental.start_date, rental.end_date)} · {days} day{days === 1 ? "" : "s"} ·{" "}
          <span className="font-medium text-zinc-900">${rental.total_price.toFixed(2)}</span>
        </p>
        <p className="text-sm text-zinc-600">
          {other.label}:{" "}
          <Link href={`/users/${other.id}`} className="text-zinc-900 underline-offset-2 hover:underline">
            {other.name}
          </Link>
        </p>
        {children && <div className="mt-2">{children}</div>}
      </div>
    </li>
  );
}
