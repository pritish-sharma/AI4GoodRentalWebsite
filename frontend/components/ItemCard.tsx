import type { Item } from "@/lib/api";
import QualityBadge from "./QualityBadge";

export default function ItemCard({ item }: { item: Item }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="aspect-[4/3] bg-zinc-100">
        {item.photo_url ? (
          // Plain <img> keeps setup simple; switch to next/image once photo hosts are configured.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photo_url}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            No photo yet
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {item.category}
        </p>
        <h3 className="font-semibold text-zinc-900">{item.title}</h3>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-sm text-zinc-900">
            ${item.price_per_day.toFixed(2)}/day
          </span>
          <QualityBadge score={item.quality_score} label={item.quality_label} />
        </div>
      </div>
    </article>
  );
}
