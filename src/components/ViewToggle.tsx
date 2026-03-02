'use client';

import { useState, useEffect } from 'react';

type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  // Persistir preferencia en localStorage
  useEffect(() => {
    const saved = localStorage.getItem('viewMode') as ViewMode;
    if (saved && (saved === 'grid' || saved === 'list')) {
      onChange(saved);
    }
  }, [onChange]);

  const handleChange = (newMode: ViewMode) => {
    onChange(newMode);
    localStorage.setItem('viewMode', newMode);
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => handleChange('grid')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
          mode === 'grid'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
        Grid
      </button>
      <button
        onClick={() => handleChange('list')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
          mode === 'list'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        Lista
      </button>
    </div>
  );
}
