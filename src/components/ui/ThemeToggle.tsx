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
        background: theme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)',
        border:
          theme === 'dark' ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(0,0,0,0.18)',
        borderRadius: '8px',
        padding: '6px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        color: theme === 'dark' ? '#f0f2f7' : '#1a1f2e',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {theme === 'dark' ? <Sun size={14} strokeWidth={2} /> : <Moon size={14} strokeWidth={2} />}
      <span style={{ fontSize: '12px', fontWeight: 500, lineHeight: 1 }}>
        {theme === 'dark' ? 'Lyst' : 'Mørkt'}
      </span>
    </button>
  );
}
