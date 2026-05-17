'use client';

import React, { useState } from 'react';
import { BookOpen, ChevronUp } from 'lucide-react';
import type { LysRecoveryStory } from '@/types/lys';

interface Props {
  story: LysRecoveryStory;
}

export default function JournalRowRecoveryStory({ story }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!story.resident_approved) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
        style={{
          borderColor: 'rgba(108,184,245,0.5)',
          color: '#6cb8f5',
          backgroundColor: 'rgba(108,184,245,0.08)',
        }}
        aria-expanded={expanded}
      >
        {expanded ? (
          <>
            <ChevronUp size={12} aria-hidden />
            Skjul fortælling
          </>
        ) : (
          <>
            <BookOpen size={12} aria-hidden />
            Læs borgerens fortælling
          </>
        )}
      </button>

      {expanded && (
        <div
          className="mt-2 rounded-lg border p-3 text-xs leading-relaxed"
          style={{
            borderColor: 'rgba(108,184,245,0.3)',
            backgroundColor: 'rgba(108,184,245,0.04)',
            color: 'var(--cp-text)',
            whiteSpace: 'pre-wrap',
          }}
        >
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--cp-muted2)' }}
          >
            Borgerens egne ord
          </div>
          {story.cleaned_story}
        </div>
      )}
    </div>
  );
}
