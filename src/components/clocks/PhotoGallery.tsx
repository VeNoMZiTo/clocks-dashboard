"use client";

import React, { useState } from "react";

interface PhotoGalleryProps {
  photos: string[];
  title: string;
}

export default function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const safePhotos = photos.length > 0 ? photos : ["/assets/clocks/placeholder.svg"];
  const activePhoto = safePhotos[activeIndex] ?? safePhotos[0];

  function goTo(index: number) {
    const nextIndex = (index + safePhotos.length) % safePhotos.length;
    setActiveIndex(nextIndex);
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <img
          src={activePhoto}
          alt={`${title} foto ${activeIndex + 1}`}
          className="h-[420px] w-full object-cover"
        />
        {safePhotos.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4">
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              className="rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur hover:bg-black/80"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              className="rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur hover:bg-black/80"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {safePhotos.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {safePhotos.map((photo, index) => (
            <button
              key={`${photo}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`overflow-hidden rounded-xl border transition ${
                index === activeIndex
                  ? "border-emerald-500"
                  : "border-zinc-800 hover:border-zinc-600"
              }`}
            >
              <img
                src={photo}
                alt={`${title} miniatura ${index + 1}`}
                className="h-20 w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
