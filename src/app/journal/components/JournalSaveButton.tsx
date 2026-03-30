'use client';

import React from 'react';

interface JournalSaveButtonProps {
  onSave: () => void;
  saved: boolean;
}

export default function JournalSaveButton({ onSave, saved }: JournalSaveButtonProps) {
  return (
    <div className="pb-4">
      <button
        onClick={onSave}
        className={`w-full rounded-2xl py-4 font-display font-bold text-lg transition-all duration-300 active:scale-95 shadow-lg ${
          saved
            ? 'bg-emerald-500 shadow-emerald-900/50 text-white'
            : 'bg-sunrise-400 hover:bg-sunrise-500 shadow-sunrise text-midnight-900'
        }`}
      >
        {saved ? '✅ Journal gemt!' : '💾 Gem dagens journal'}
      </button>
      {saved && (
        <p className="text-center text-xs text-midnight-400 mt-2 animate-slide-up">
          Flot! Du har reflekteret over din dag 🌟
        </p>
      )}
    </div>
  );
}
