'use client';

import { ClockItem } from '@/types/clock';
import { ClockCard } from './ClockCard';

interface ClocksGridProps {
  clocks: ClockItem[];
  onArchive?: (id: number, archived: boolean) => void;
  onFavorite?: (id: string) => void;
  onClick?: (clock: ClockItem) => void;
}

export function ClocksGrid({
  clocks,
  onArchive,
  onFavorite,
  onClick,
}: ClocksGridProps) {
  if (clocks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">⏰</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No hay relojes para mostrar
        </h3>
        <p className="text-gray-500">
          Intenta ajustar los filtros o recargar la página
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {clocks.map((clock) => (
        <ClockCard
          key={clock.id}
          clock={clock}
          onArchive={onArchive}
          onFavorite={onFavorite}
          onClick={onClick}
        />
      ))}
    </div>
  );
}
