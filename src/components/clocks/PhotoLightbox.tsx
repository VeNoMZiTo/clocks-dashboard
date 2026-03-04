"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

interface PhotoLightboxProps {
  photos: string[];
  title: string;
  initialIndex: number;
  onClose: () => void;
  onArchive?: () => void;
  price?: number | null;
  source?: string | null;
  island?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
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
  onClose,
  onArchive,
  price,
  source,
  island,
  description,
  sourceUrl
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragAxis, setDragAxis] = useState<"x" | "y" | null>(null);
  const [quality, setQuality] = useState<PhotoQuality | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPhoto = photos[currentIndex] || photos[0] || "";

  // Reset image state when photo changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [currentPhoto]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        handlePrev();
      } else if (event.key === "ArrowRight") {
        handleNext();
      } else if (event.key === "e" || event.key === "E") {
        if (onArchive) {
          onArchive();
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onArchive]);

  // Detect photo quality
  useEffect(() => {
    if (!currentPhoto) return;
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
    // NO usar setPointerCapture - bloquea clicks en elementos hijos
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
    
    // NO usar releasePointerCapture - no usamos setPointerCapture
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
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="fixed right-6 top-6 z-[10000] rounded-full bg-black/60 p-3 text-white backdrop-blur hover:bg-black/80 transition cursor-pointer"
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
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="fixed left-6 top-1/2 -translate-y-1/2 z-[10000] rounded-full bg-black/60 p-3 text-white backdrop-blur hover:bg-black/80 transition cursor-pointer"
            aria-label="Foto anterior"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="fixed right-6 top-1/2 -translate-y-1/2 z-[10000] rounded-full bg-black/60 p-3 text-white backdrop-blur hover:bg-black/80 transition cursor-pointer"
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
        className="fixed inset-0 flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
          {/* No photos state */}
          {!currentPhoto && (
            <div className="text-zinc-500 text-center">
              <svg className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>Sin fotos disponibles</p>
            </div>
          )}

          {/* Loading state */}
          {currentPhoto && !imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-600 border-t-white" />
            </div>
          )}

          {/* Error state */}
          {currentPhoto && imageError && (
            <div className="text-zinc-500 text-center">
              <svg className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>Error al cargar la imagen</p>
            </div>
          )}

          {/* Actual image */}
          {currentPhoto && !imageError && (
            <img
              ref={imageRef}
              src={currentPhoto}
              alt={`${title} foto ${currentIndex + 1}`}
              className="max-h-[80vh] max-w-[80vw] object-contain select-none"
              style={{
                transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                cursor: scale > 1 ? "grab" : "default",
                opacity: imageLoaded ? 1 : 0.5
              }}
              draggable={false}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
      </div>

      {/* Info overlay */}
      <div className="fixed bottom-0 left-0 right-0 z-[10001] bg-gradient-to-t from-black/80 to-transparent px-6 py-8">
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
          <p className="text-white/90 text-sm font-medium">
            {title}
          </p>

          {/* Island and description */}
          {(island || description) && (
            <div className="space-y-1">
              {island && (
                <p className="text-zinc-300 text-sm">
                  📍 {island}
                </p>
              )}
              {description && (
                <p className="text-zinc-400 text-xs line-clamp-2">
                  {description}
                </p>
              )}
            </div>
          )}

          {/* Price and source */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {price != null && (
              <span className="text-emerald-400 font-semibold text-base">
                {price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            )}
            {source && (
              <span className="text-zinc-400">
                Fuente: {sourceUrl ? (
                  <a 
                    href={sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {source}
                  </a>
                ) : (
                  <span className="text-zinc-300">{source}</span>
                )}
              </span>
            )}
          </div>

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
