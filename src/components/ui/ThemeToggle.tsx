'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { applyBudrTheme, readStoredBudrTheme, type BudrTheme } from '@/lib/budrTheme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<BudrTheme>('light');

  useEffect(() => {
    const initial = readStoredBudrTheme();
    setTheme(initial);
    applyBudrTheme(initial);
  }, []);

  const toggle = () => {
    const next: BudrTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyBudrTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Skift tema"
      title={theme === 'dark' ? 'Skift til lyst tema' : 'Skift til mørkt tema'}
      style={{
        background: 'transparent',
        border: '1px solid color-mix(in srgb, currentColor 28%, transparent)',
        borderRadius: '8px',
        padding: '0 12px',
        minHeight: '36px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        color: 'inherit',
        font: 'inherit',
        transition: 'background 0.15s',
      }}
    >
      {theme === 'dark' ? <Sun size={14} strokeWidth={2} /> : <Moon size={14} strokeWidth={2} />}
      <span style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1 }}>
        {theme === 'dark' ? 'Lyst' : 'Mørkt'}
      </span>
    </button>
  );
}
