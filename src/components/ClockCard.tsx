'use client';

import { ClockItem } from '@/types/clock';
import { useState } from 'react';
import Image from 'next/image';

interface ClockCardProps {
  clock: ClockItem;
  onArchive?: (id: number, archived: boolean) => void;
  onFavorite?: (id: string) => void;
  onClick?: (clock: ClockItem) => void;
}

export function ClockCard({ clock, onArchive, onFavorite, onClick }: ClockCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isArchiving) return;

    setIsArchiving(true);
    try {
      await onArchive?.(parseInt(clock.id), clock.archived === 0);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite?.(clock.id);
  };

  const isArchived = clock.archived === 1;
  const hasPhoto = clock.photos.length > 0 && !imageError;
  const photoUrl = hasPhoto ? clock.photos[0] : null;

  return (
    <div
      onClick={() => onClick?.(clock)}
      className="group relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 hover:border-blue-500"
    >
      {/* Badge archivado */}
      {isArchived && (
        <div className="absolute top-2 left-2 z-10 bg-gray-800 text-white text-xs px-2 py-1 rounded-full">
          Archivado
        </div>
      )}

      {/* Foto */}
      <div className="relative aspect-square bg-gray-100">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={clock.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}

        {/* Hover overlay con acciones */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <button
            onClick={handleArchive}
            disabled={isArchiving}
            className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isArchiving
              ? '...'
              : isArchived
              ? 'Desarchivar'
              : 'Archivar'}
          </button>
          <button
            onClick={handleFavorite}
            className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100"
          >
            ❤
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Precio */}
        <div className="text-2xl font-bold text-blue-600 mb-1">
          {clock.latest_price}€
        </div>

        {/* Título */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {clock.title}
        </h3>

        {/* Meta info */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="flex items-center gap-1">
            📍 {clock.island_name}
          </span>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
            {clock.source}
          </span>
        </div>

        {/* First seen */}
        <div className="mt-2 text-xs text-gray-400">
          {new Date(clock.first_seen_at).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
          })}
        </div>
      </div>
    </div>
  );
}
