'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('budr-theme') as 'dark' | 'light' | null;
    const initial = stored || 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('budr-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Skift tema"
      title={theme === 'dark' ? 'Skift til lyst tema' : 'Skift til mørkt tema'}
      style={{
        background: theme === 'dark' ? '#ffffff' : '#1a1f2e',
        border: 'none',
        borderRadius: '8px',
        padding: '6px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        color: theme === 'dark' ? '#1a1f2e' : '#ffffff',
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
