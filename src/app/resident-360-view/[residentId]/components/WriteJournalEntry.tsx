'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = ['Observation', 'Hændelse', 'Samtale', 'Medicin', 'Stemning', 'Andet'];

interface Props {
  residentId: string;
  residentName: string;
}

export default function WriteJournalEntry({ residentId, residentName }: Props) {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [text, setText]         = useState('');
  const [category, setCategory] = useState('Observation');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  function handleOpen() {
    setText('');
    setCategory('Observation');
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError('Forbindelsesfejl — prøv igen');
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const staffName =
      (user?.user_metadata?.full_name as string | undefined) ??
      user?.email ??
      'Ukendt personale';

    const { error: insertError } = await supabase.from('journal_entries').insert({
      resident_id: residentId,
      staff_id:    user?.id ?? null,
      staff_name:  staffName,
      entry_text:  text.trim(),
      category,
    });

    if (insertError) {
      setError('Kunne ikke gemme notat — prøv igen');
      setSaving(false);
      return;
    }

    setOpen(false);
    setSaving(false);
    router.refresh(); // re-run server component to show new entry
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-2 bg-[#0F1B2D] text-white text-xs font-semibold rounded-lg hover:bg-[#1a2d47] transition-colors"
      >
        <Plus size={13} />
        Skriv notat
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Skriv journalnotat</h2>
                <p className="text-xs text-gray-500 mt-0.5">{residentName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Category pills */}
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-2">Kategori</span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        category === cat
                          ? 'bg-[#0F1B2D] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text */}
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-2">Notat</span>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Beskriv observationen, hændelsen eller samtalen…"
                  rows={5}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-[#1D9E75] transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 pb-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Annuller
              </button>
              <button
                type="button"
                disabled={!text.trim() || saving}
                onClick={() => void handleSave()}
                className="flex items-center gap-2 px-5 py-2 bg-[#1D9E75] text-white text-sm font-semibold rounded-xl hover:bg-[#18886a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Gem notat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
