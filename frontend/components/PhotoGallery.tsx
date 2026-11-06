"use client";

import { useState } from "react";

export default function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const [shown, setShown] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
        No photo yet
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[shown]} alt={title} className="h-full w-full object-cover" />
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((url, i) => (
            <button
              key={url}
              onClick={() => setShown(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === shown ? "true" : undefined}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === shown ? "border-zinc-900" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
