'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, FileOutput } from 'lucide-react';
import ResidentExportModule from './ResidentExportModule';
import type { ResidentExportInput } from '@/lib/residentExport/types';

type Props = {
  exportInput: ResidentExportInput;
};

export default function ResidentOverflowMenu({ exportInput }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [dropdownOpen]);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-sm transition-colors hover:bg-[rgba(255,255,255,0.04)]"
          style={{
            borderColor: 'var(--cp-border)',
            color: 'var(--cp-muted)',
          }}
          aria-label="Flere handlinger"
          aria-expanded={dropdownOpen}
        >
          <MoreHorizontal size={16} aria-hidden />
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-1.5 min-w-[220px] overflow-hidden rounded-xl border shadow-xl"
            style={{
              backgroundColor: 'var(--cp-bg2)',
              borderColor: 'var(--cp-border)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setExportOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              style={{ color: 'var(--cp-text)' }}
            >
              <FileOutput size={15} className="shrink-0 text-[var(--cp-muted)]" aria-hidden />
              Udtræk til samarbejdspartner
            </button>
          </div>
        )}
      </div>

      <ResidentExportModule
        exportInput={exportInput}
        carePortalDark
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </>
  );
}
