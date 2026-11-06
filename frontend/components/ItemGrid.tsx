import type { Item } from "@/lib/api";
import ItemCard from "./ItemCard";

export default function ItemGrid({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
