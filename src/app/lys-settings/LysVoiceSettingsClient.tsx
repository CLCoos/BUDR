'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Volume2, Loader2 } from 'lucide-react';
import { LYS_VOICE_CHOICES } from '@/lib/voice/voices';

export default function LysVoiceSettingsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(LYS_VOICE_CHOICES[0]!.id);
  const [autoplay, setAutoplay] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/lys-chat');
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/park/resident-me', { credentials: 'same-origin' })
      .then(async (r) => {
        if (r.ok) return r.json();
        if (r.status === 401) {
          setError('Ingen beboersession fundet. Åbn Lys-chat først og prøv igen.');
        }
        return null;
      })
      .then((d) => {
        if (cancelled || !d) return;
        if (typeof d.lys_voice_effective_id === 'string') setSelectedId(d.lys_voice_effective_id);
        else if (typeof d.lys_voice_id === 'string' && d.lys_voice_id)
          setSelectedId(d.lys_voice_id);
        setAutoplay(!!d.lys_voice_autoplay);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function preview(voiceId: string) {
    const sample = 'Hej, jeg er Lys. Sådan kan jeg lyde, når jeg læser beskeder højt for dig.';
    setPlayingId(voiceId);
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ text: sample, voiceId }),
      });
      if (!res.ok) {
        setError('Kunne ikke afspille lige nu.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.onended = () => URL.revokeObjectURL(url);
      await a.play();
    } catch {
      setError('Afspilning fejlede.');
    } finally {
      setPlayingId(null);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/voice/save-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ lys_voice_id: selectedId, lys_voice_autoplay: autoplay }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Kunne ikke gemme');
        return;
      }
      goBack();
    } catch {
      setError('Netværksfejl');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="flex min-h-dvh flex-col font-sans"
      style={{ backgroundColor: '#131920', color: '#e8edf5' }}
    >
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={goBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/70"
          aria-label="Tilbage"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-teal-300">Stemme</h1>
          <p className="text-xs text-white/50">Lys læser højt og forstår tale</p>
        </div>
      </header>

      <main className="flex-1 space-y-6 overflow-y-auto px-4 py-5 pb-28">
        {loading ? (
          <p className="text-sm text-white/50">Henter…</p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-white/70">
              Vælg hvilken stemme Lys skal have, når du får svar læst højt.
            </p>

            <div className="space-y-2">
              {LYS_VOICE_CHOICES.map((v) => (
                <label
                  key={v.id}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <input
                    type="radio"
                    name="lys-voice"
                    checked={selectedId === v.id}
                    onChange={() => setSelectedId(v.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{v.name}</p>
                    <p className="text-xs text-white/55">{v.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      void preview(v.id);
                    }}
                    className="shrink-0 rounded-full border border-teal-400/30 bg-teal-500/15 px-2 py-1.5 text-teal-200"
                  >
                    {playingId === v.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                </label>
              ))}
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
              <input
                type="checkbox"
                checked={autoplay}
                onChange={(e) => setAutoplay(e.target.checked)}
              />
              <span>
                Læs Lys&apos; beskeder højt automatisk (efter du har trykket et sted på skærmen)
              </span>
            </label>

            {error ? <p className="text-sm text-amber-300">{error}</p> : null}

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="w-full rounded-2xl bg-gradient-to-r from-teal-400 to-teal-600 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
            >
              {saving ? 'Gemmer…' : 'Gem ændringer'}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
