'use client';

import { useEffect, useState } from 'react';

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
        background: 'var(--cp-bg3)',
        border: '1px solid var(--cp-border2)',
        borderRadius: '8px',
        padding: '6px 10px',
        cursor: 'pointer',
        fontSize: '16px',
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: 'var(--cp-muted)',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
      <span style={{ fontSize: '12px', fontWeight: 500 }}>
        {theme === 'dark' ? 'Lyst' : 'Mørkt'}
      </span>
    </button>
  );
}
