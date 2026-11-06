import type { RentalStatus } from "@/lib/client-api";

const STYLES: Record<RentalStatus, { label: string; className: string }> = {
  requested: { label: "Waiting for owner", className: "bg-amber-100 text-amber-900" },
  accepted: { label: "Accepted", className: "bg-sky-100 text-sky-900" },
  active: { label: "Picked up", className: "bg-violet-100 text-violet-900" },
  returned: { label: "Returned", className: "bg-emerald-100 text-emerald-900" },
  declined: { label: "Declined", className: "bg-zinc-100 text-zinc-600" },
  cancelled: { label: "Cancelled", className: "bg-zinc-100 text-zinc-600" },
};

export default function StatusPill({ status, ownerView = false }: { status: RentalStatus; ownerView?: boolean }) {
  const style = STYLES[status];
  const label = ownerView && status === "requested" ? "Needs your answer" : style.label;
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}>
      {label}
    </span>
  );
}
