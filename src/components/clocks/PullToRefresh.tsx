"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const axisRef = useRef<"x" | "y" | null>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const threshold = 80;
  const maxPull = 120;

  const refreshIndicatorOpacity = Math.min(1, pullDistance / threshold);
  const refreshIndicatorRotation = (pullDistance / threshold) * 360;

  const animateTo = useCallback((value: number) => {
    setPullDistance(value);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    if (value !== 0) {
      animationRef.current = setTimeout(() => {
        setPullDistance(0);
        animationRef.current = null;
      }, 300);
    }
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isRefreshing) return;
    
    // Only start if we're at the top of the scroll
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    startYRef.current = event.clientY;
    axisRef.current = null;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [disabled, isRefreshing]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled) return;

    const dy = event.clientY - startYRef.current;

    // Determine axis on first significant movement
    if (!axisRef.current) {
      if (Math.abs(dy) < 8) return;
      axisRef.current = dy > 0 ? "y" : "x";
    }

    // Only handle downward pulls
    if (axisRef.current !== "y" || dy <= 0) return;

    event.preventDefault();
    
    // Apply resistance as user pulls
    const resistance = 0.5;
    const distance = Math.min(maxPull, dy * resistance);
    setPullDistance(distance);
  }, [isDragging, disabled]);

  const handlePointerUp = useCallback(async (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animateTo(0);
      }
    } else {
      animateTo(0);
    }
  }, [isDragging, pullDistance, isRefreshing, onRefresh, animateTo]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-auto"
      style={{
        touchAction: isDragging ? "none" : "auto"
      }}
    >
      {/* Refresh indicator */}
      <div
        className="absolute left-1/2 z-50 flex -translate-x-1/2 flex-col items-center justify-center transition-opacity"
        style={{
          top: pullDistance - 40,
          opacity: refreshIndicatorOpacity
        }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 shadow-lg"
          style={{
            transform: isRefreshing 
              ? "rotate(0deg)" 
              : `rotate(${refreshIndicatorRotation}deg)`
          }}
        >
          {isRefreshing ? (
            <svg
              className="h-5 w-5 animate-spin text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
        </div>
        <span className="mt-2 text-xs text-zinc-400">
          {isRefreshing ? "Actualizando..." : pullDistance >= threshold ? "Suelta para actualizar" : "Tira para actualizar"}
        </span>
      </div>

      {/* Content with pull transform */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isDragging ? "none" : "transform 300ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
