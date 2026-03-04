"use client";

import React, { useState, useRef } from "react";
import LazyImage from "./LazyImage";
import PhotoLightbox from "./PhotoLightbox";

interface PhotoGalleryProps {
  photos: string[];
  title: string;
  onArchive?: () => void;
}

export default function PhotoGallery({ photos, title, onArchive }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dragAxisRef = useRef<"x" | "y" | null>(null);

  const safePhotos = photos.length > 0 ? photos : ["/assets/clocks/placeholder.svg"];
  const activePhoto = safePhotos[activeIndex] ?? safePhotos[0];

  function goTo(index: number) {
    const nextIndex = (index + safePhotos.length) % safePhotos.length;
    setActiveIndex(nextIndex);
  }

  function openLightbox(index: number) {
    setActiveIndex(index);
    setIsLightboxOpen(true);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    dragAxisRef.current = null;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;

    const dx = event.clientX - startXRef.current;
    const dy = event.clientY - startYRef.current;

    // Determine axis on first significant movement
    if (!dragAxisRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      dragAxisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }

    // Only handle horizontal swipes
    if (dragAxisRef.current !== "x") return;

    event.preventDefault();
    setDragDistance(Math.max(-120, Math.min(120, dx)));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);

    if (dragDistance < -80) {
      goTo(activeIndex + 1);
    } else if (dragDistance > 80) {
      goTo(activeIndex - 1);
    }

    setDragDistance(0);
  }

  return (
    <div className="space-y-4">
      {/* Main photo viewer */}
      <div
        className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="relative h-[420px] w-full"
          style={{
            transform: `translateX(${dragDistance}px)`,
            transition: isDragging ? "none" : "transform 300ms ease",
            touchAction: "pan-y"
          }}
        >
          <LazyImage
            src={activePhoto}
            alt={`${title} foto ${activeIndex + 1}`}
            containerClassName="h-full w-full"
            className="h-full w-full object-cover cursor-zoom-in transition-transform hover:scale-[1.02]"
            loading="eager"
            onClick={() => openLightbox(activeIndex)}
          />
        </div>

        {/* Navigation buttons */}
        {safePhotos.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4">
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              className="rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur hover:bg-black/80 transition"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              className="rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur hover:bg-black/80 transition"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* Zoom indicator hint */}
        <button
          type="button"
          onClick={() => openLightbox(activeIndex)}
          className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white backdrop-blur opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
          title="Abrir en pantalla completa"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
      </div>

      {/* Thumbnails */}
      {safePhotos.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {safePhotos.map((photo, index) => (
            <button
              key={`${photo}-${index}`}
              type="button"
              onClick={() => openLightbox(index)}
              className={`overflow-hidden rounded-xl border transition hover:scale-105 ${
                index === activeIndex
                  ? "border-emerald-500 ring-2 ring-emerald-500/30"
                  : "border-zinc-800 hover:border-zinc-600"
              }`}
            >
              <LazyImage
                src={photo}
                alt={`${title} miniatura ${index + 1}`}
                containerClassName="h-20 w-full"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {isLightboxOpen && (
        <PhotoLightbox
          photos={safePhotos}
          title={title}
          initialIndex={activeIndex}
          onClose={() => setIsLightboxOpen(false)}
          onArchive={onArchive}
        />
      )}
    </div>
  );
}
