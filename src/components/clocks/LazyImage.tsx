"use client";

import React, { useState, useEffect } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  placeholderClassName?: string;
  loading?: "lazy" | "eager";
}

export default function LazyImage({
  src,
  alt,
  className = "",
  containerClassName = "",
  placeholderClassName = "",
  loading = "lazy"
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when src changes
    setLoaded(false);
    setError(false);
    setImageSrc(src);
  }, [src]);

  function handleLoad() {
    setLoaded(true);
  }

  function handleError() {
    setError(true);
    setLoaded(true);
  }

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {/* Placeholder skeleton */}
      {!loaded && (
        <div
          className={`absolute inset-0 animate-pulse bg-zinc-800 ${placeholderClassName || className}`}
          aria-hidden="true"
        />
      )}

      {/* Error state */}
      {error && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-600 ${className}`}
          aria-label={`Error loading image: ${alt}`}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      {/* Actual image */}
      {imageSrc && !error && (
        <img
          src={imageSrc}
          alt={alt}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${className}`}
        />
      )}
    </div>
  );
}
