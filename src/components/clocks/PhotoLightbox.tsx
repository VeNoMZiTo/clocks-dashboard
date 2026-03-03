"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

interface PhotoLightboxProps {
  photos: string[];
  title: string;
  initialIndex: number;
  onClose: () => void;
}

interface PhotoQuality {
  width?: number;
  height?: number;
  resolution: string;
  quality: "low" | "medium" | "high" | "unknown";
}

export default function PhotoLightbox({
  photos,
  title,
  initialIndex,
  onClose
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragAxis, setDragAxis] = useState<"x" | "y" | null>(null);
  const [quality, setQuality] = useState<PhotoQuality | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPhoto = photos[currentIndex] || photos[0];

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        handlePrev();
      } else if (event.key === "ArrowRight") {
        handleNext();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  // Detect photo quality
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const totalPixels = width * height;
      
      let quality: PhotoQuality["quality"] = "unknown";
      let resolution = "Desconocida";

      if (totalPixels < 500000) {
        quality = "low";
        resolution = "Baja";
      } else if (totalPixels < 2000000) {
        quality = "medium";
        resolution = "Media";
      } else {
        quality = "high";
        resolution = "Alta";
      }

      setQuality({ width, height, resolution, quality });
    };
    img.src = currentPhoto;
  }, [currentPhoto]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    resetZoom();
  }, [photos.length, resetZoom]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    resetZoom();
  }, [photos.length, resetZoom]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    setDragStart({ x: event.clientX, y: event.clientY });
    setDragAxis(null);
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;

    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;

    // Determine axis on first significant movement
    if (!dragAxis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      setDragAxis(Math.abs(dx) > Math.abs(dy) ? "x" : "y");
    }

    // Only handle if zoomed in
    if (scale <= 1) return;

    if (dragAxis === "x") {
      setPosition((prev) => ({ ...prev, x: dx }));
    } else {
      setPosition((prev) => ({ ...prev, y: dy }));
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);

    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;

    // Swipe to next/prev photo if not zoomed
    if (scale <= 1 && dragAxis === "x") {
      if (dx > 80) {
        handlePrev();
        return;
      }
      if (dx < -80) {
        handleNext();
        return;
      }
    }

    // Reset position
    setPosition({ x: 0, y: 0 });
  }

  function handleWheel(event: React.WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(5, scale + delta));
    setScale(newScale);
    if (newScale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }

  function getQualityColor(quality: PhotoQuality["quality"]) {
    switch (quality) {
      case "low": return "text-rose-400";
      case "medium": return "text-yellow-400";
      case "high": return "text-emerald-400";
      default: return "text-zinc-400";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="fixed right-6 top-6 z-50 rounded-full bg-black/60 p-3 text-white backdrop-blur hover:bg-black/80 transition"
        aria-label="Cerrar"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Navigation buttons */}
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="fixed left-6 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white backdrop-blur hover:bg-black/80 transition"
            aria-label="Foto anterior"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="fixed right-6 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white backdrop-blur hover:bg-black/80 transition"
            aria-label="Siguiente foto"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex h-full items-center justify-center">
          <img
            ref={imageRef}
            src={currentPhoto}
            alt={`${title} foto ${currentIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-150 ease-out select-none"
            style={{
              transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
              cursor: scale > 1 ? "grab" : "default"
            }}
            draggable={false}
          />
        </div>
      </div>

      {/* Info overlay */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/80 to-transparent px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Photo counter */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <p className="text-sm">
                {currentIndex + 1} / {photos.length}
              </p>
              {quality && (
                <span className={`text-sm ${getQualityColor(quality.quality)}`}>
                  {quality.resolution}
                  {quality.width && quality.height && (
                    <span className="text-xs text-zinc-400">
                      {" " }({quality.width} × {quality.height}px)
                    </span>
                  )}
                </span>
              )}
            </div>
            {scale > 1 && (
              <button
                type="button"
                onClick={resetZoom}
                className="rounded-full border border-zinc-700 bg-black/60 px-4 py-2 text-xs text-zinc-300 backdrop-blur hover:border-zinc-500 transition"
              >
                Reset zoom
              </button>
            )}
          </div>

          {/* Photo title */}
          <p className="text-white/90 text-sm">
            {title}
          </p>

          {/* Zoom indicator */}
          {scale > 1 && (
            <div className="text-xs text-zinc-400">
              Zoom: {(scale * 100).toFixed(0)}% (rueda del ratón para ajustar)
            </div>
          )}

          {/* Instructions */}
          <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
            <span>← → / deslizar: Navegar</span>
            <span>Esc / clic fuera: Cerrar</span>
            <span>Rueda: Zoom</span>
          </div>
        </div>
      </div>
    </div>
  );
}
