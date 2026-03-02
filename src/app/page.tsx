'use client';

import { useState } from 'react';
import { ClocksGrid, ViewToggle, ImageViewer } from '@/components';
import { ClockItem } from '@/types/clock';

export default function Home() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedClock, setSelectedClock] = useState<ClockItem | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  // Datos de ejemplo (en producción, vendrían de la API)
  const exampleClocks: ClockItem[] = [
    {
      id: '1',
      title: 'Rolex Submariner Date 41mm',
      description: 'Reloj de buceo en excelente estado',
      latest_price: '8500',
      island_id: 1,
      island_name: 'Tenerife',
      island_slug: 'tenerife',
      source: 'wallapop',
      first_seen_at: '2026-03-01T10:30:00Z',
      photos: [
        'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800',
      ],
      price_history: [
        { price: '8500', seen_at: '2026-03-01' },
        { price: '9000', seen_at: '2026-02-20' },
      ],
      archived: 0,
    },
    {
      id: '2',
      title: 'Omega Seamaster Professional',
      description: 'Cronómetro certificado, caja y papeles',
      latest_price: '3200',
      island_id: 2,
      island_name: 'Gran Canaria',
      island_slug: 'gran-canaria',
      source: 'milanuncios',
      first_seen_at: '2026-03-01T08:15:00Z',
      photos: [
        'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800',
      ],
      price_history: [{ price: '3200', seen_at: '2026-03-01' }],
      archived: 0,
    },
  ];

  const handleArchive = async (id: number, archived: boolean) => {
    console.log(`Archiving clock ${id}:`, archived);
    // En producción: await archiveClock(id, archived);
  };

  const handleFavorite = (id: string) => {
    console.log(`Favoriting clock ${id}`);
    // En producción: await addFavorite(id);
  };

  const handleClockClick = (clock: ClockItem) => {
    setSelectedClock(clock);
    if (clock.photos.length > 0) {
      setImageIndex(0);
      setShowImageViewer(true);
    }
  };

  const handleImageViewerClose = () => {
    setShowImageViewer(false);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ⏰ Clocks Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Radar de Relojes en Canarias
              </p>
            </div>

            <div className="flex items-center gap-4">
              <ViewToggle mode={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters placeholder */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar relojes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas las islas</option>
              <option value="tenerife">Tenerife</option>
              <option value="gran-canaria">Gran Canaria</option>
              <option value="lanzarote">Lanzarote</option>
              <option value="fuerteventura">Fuerteventura</option>
            </select>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded text-blue-600" />
              <span className="text-sm text-gray-700">Solo archivados</span>
            </label>
          </div>
        </div>

        {/* Grid de relojes */}
        <ClocksGrid
          clocks={exampleClocks}
          onArchive={handleArchive}
          onFavorite={handleFavorite}
          onClick={handleClockClick}
        />
      </div>

      {/* Image Viewer Modal */}
      {showImageViewer && selectedClock && (
        <ImageViewer
          images={selectedClock.photos}
          initialIndex={imageIndex}
          onClose={handleImageViewerClose}
        />
      )}
    </main>
  );
}
