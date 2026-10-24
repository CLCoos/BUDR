'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Check, Mic, Square, X } from 'lucide-react';

/**
 * «Fortæl» i demoen: medarbejderen fortæller med egne ord, BUDR foreslår notat, delmål,
 * aftale og overlevering. Alt er lokalt; tale simuleres ved at skrive eksemplet frem.
 */

type Ctx = { openFortael: () => void };
const FortaelContext = createContext<Ctx>({ openFortael: () => {} });
export const useDemoFortael = () => useContext(FortaelContext);

const EXAMPLE =
  'SK og jeg var ude og handle efter hendes liste. Hun klarede kassen selv og var stolt bagefter. Hun spurgte, om vi kan gøre det igen på tirsdag.';

type Proposal = { id: string; title: string; detail: string };

function proposalsFor(text: string): { resident: string; items: Proposal[] } {
  const t = text.toLowerCase();
  // Initialer på skærmen (GDPR); medarbejderen må gerne sige fornavnet.
  const has = (first: string, ini: string) =>
    t.includes(first) || new RegExp(`\\b${ini}\\b`).test(t);
  const resident = has('camilla', 'cb')
    ? 'CB'
    : has('anders', 'ap')
      ? 'AP'
      : has('mikkel', 'mt')
        ? 'MT'
        : 'SK';
  const first = resident;
  const items: Proposal[] = [
    {
      id: 'notat',
      title: 'Pædagogisk notat',
      detail: `${first} deltog i indkøb efter egen liste og betalte selv ved kassen. Udtrykte stolthed bagefter og ønsker at gentage det tirsdag.`,
    },
  ];
  if (t.includes('handle') || t.includes('indkøb') || t.includes('liste')) {
    items.push({
      id: 'delmaal',
      title: 'Delmål 1: handle ind efter liste',
      detail: 'Fremskridt 60 % → 70 % (4. gang selv i oktober)',
    });
  }
  if (t.includes('tirsdag') || t.includes('igen')) {
    items.push({
      id: 'aftale',
      title: 'Aftale tirsdag kl. 10',
      detail: `I kalenderen og i ${first}’s Lys-app`,
    });
  }
  items.push({
    id: 'overlevering',
    title: 'Med i dagens overlevering',
    detail: 'Til aftenvagten kl. 15',
  });
  return { resident, items };
}

type Phase = 'skriv' | 'forslag' | 'gemt';

function FortaelSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState<Phase>('skriv');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const timer = useRef<number | null>(null);
  const result = proposalsFor(text);

  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setListening(false);
  };

  const listen = () => {
    if (listening) return stop();
    setText('');
    setListening(true);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 3;
      setText(EXAMPLE.slice(0, i));
      if (i >= EXAMPLE.length) stop();
    }, 40);
  };

  useEffect(() => () => stop(), []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const makeProposals = () => {
    stop();
    setChecked(Object.fromEntries(proposalsFor(text).items.map((p) => [p.id, true])));
    setPhase('forslag');
  };
  const chosen = result.items.filter((p) => checked[p.id]).length;

  return (
    <div
      className="fixed inset-0 z-[10080] flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fortael-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl border sm:rounded-3xl"
        style={{ backgroundColor: 'var(--cp-bg2)', borderColor: 'var(--cp-border)' }}
      >
        <div
          className="flex items-center gap-3 border-b px-5 py-4"
          style={{ borderColor: 'var(--cp-border)' }}
        >
          <div className="min-w-0 flex-1">
            <h2
              id="fortael-title"
              className="text-lg font-semibold"
              style={{ color: 'var(--cp-text)' }}
            >
              {phase === 'skriv'
                ? 'Fortæl'
                : phase === 'forslag'
                  ? `Du fortalte om ${result.resident}`
                  : 'Gemt'}
            </h2>
            <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              {phase === 'skriv'
                ? 'Sig eller skriv med dine egne ord, hvad der skete. Du behøver ikke vælge skema.'
                : phase === 'forslag'
                  ? 'BUDR foreslår. Intet gemmes, før du godkender.'
                  : 'I demoen gemmes intet.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk"
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ color: 'var(--cp-muted)' }}
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {phase === 'skriv' && (
            <div className="flex flex-col items-center gap-5">
              <button
                type="button"
                onClick={listen}
                aria-pressed={listening}
                className="flex h-24 w-24 items-center justify-center rounded-full transition-transform active:scale-95"
                style={{
                  backgroundColor: listening ? 'var(--cp-red)' : 'var(--cp-green)',
                  color: '#fff',
                  boxShadow: `0 0 0 ${listening ? 14 : 10}px ${listening ? 'var(--cp-red-dim)' : 'var(--cp-green-dim)'}`,
                }}
              >
                {listening ? <Square size={30} aria-hidden /> : <Mic size={34} aria-hidden />}
                <span className="sr-only">{listening ? 'Stop' : 'Tal'}</span>
              </button>
              <p className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                {listening ? 'Lytter … tryk for at stoppe' : 'Tryk og tal'}
              </p>
              <label className="w-full">
                <span className="sr-only">Eller skriv her</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder="Eller skriv her, fx «SK og jeg var ude og handle …»"
                  className="w-full resize-none rounded-2xl border px-4 py-3 text-[15px] leading-relaxed outline-none focus:ring-2"
                  style={{
                    borderColor: 'var(--cp-border2)',
                    backgroundColor: 'var(--cp-bg)',
                    color: 'var(--cp-text)',
                  }}
                />
              </label>
            </div>
          )}

          {phase === 'forslag' && (
            <div className="flex flex-col gap-4">
              <blockquote
                className="rounded-2xl border px-4 py-3 text-[15px] italic leading-relaxed"
                style={{
                  borderColor: 'var(--cp-border)',
                  color: 'var(--cp-text)',
                  backgroundColor: 'var(--cp-bg)',
                }}
              >
                «{text}»
              </blockquote>
              <ul className="flex flex-col gap-2">
                {result.items.map((p) => {
                  const on = checked[p.id];
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => setChecked((c) => ({ ...c, [p.id]: !c[p.id] }))}
                        className="flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left"
                        style={{
                          borderColor: on ? 'var(--cp-green)' : 'var(--cp-border)',
                          backgroundColor: on ? 'var(--cp-green-dim)' : 'var(--cp-bg2)',
                        }}
                      >
                        <span
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2"
                          style={{
                            borderColor: on ? 'var(--cp-green)' : 'var(--cp-border2)',
                            backgroundColor: on ? 'var(--cp-green)' : 'transparent',
                          }}
                        >
                          {on && <Check size={14} strokeWidth={3} color="#fff" aria-hidden />}
                        </span>
                        <span className="min-w-0">
                          <span
                            className="block text-[15px] font-semibold"
                            style={{ color: 'var(--cp-text)' }}
                          >
                            {p.title}
                          </span>
                          <span className="block text-sm" style={{ color: 'var(--cp-muted)' }}>
                            {p.detail}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {phase === 'gemt' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
              >
                <Check size={32} aria-hidden />
              </span>
              <p className="text-lg font-semibold" style={{ color: 'var(--cp-text)' }}>
                {chosen} ting er opdateret
              </p>
              <p className="max-w-[40ch] text-sm" style={{ color: 'var(--cp-muted)' }}>
                Notatet ligger klar til fagsystemet i morgen, og det bliver en kilde i{' '}
                {result.resident}’s næste statusudtalelse.
              </p>
            </div>
          )}
        </div>

        <div
          className="flex gap-2 border-t px-5 py-4"
          style={{
            borderColor: 'var(--cp-border)',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          {phase === 'skriv' && (
            <button
              type="button"
              disabled={text.trim().length < 10}
              onClick={makeProposals}
              className="min-h-[52px] flex-1 rounded-2xl text-[15px] font-semibold disabled:opacity-40"
              style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
            >
              Lav forslag
            </button>
          )}
          {phase === 'forslag' && (
            <>
              <button
                type="button"
                onClick={() => setPhase('skriv')}
                className="min-h-[52px] rounded-2xl border px-5 text-[15px] font-medium"
                style={{ borderColor: 'var(--cp-border2)', color: 'var(--cp-text)' }}
              >
                Ret
              </button>
              <button
                type="button"
                disabled={chosen === 0}
                onClick={() => setPhase('gemt')}
                className="min-h-[52px] flex-1 rounded-2xl text-[15px] font-semibold disabled:opacity-40"
                style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
              >
                Godkend {chosen === result.items.length ? 'alle' : chosen}
              </button>
            </>
          )}
          {phase === 'gemt' && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[52px] flex-1 rounded-2xl text-[15px] font-semibold"
              style={{ backgroundColor: 'var(--cp-text)', color: 'var(--cp-bg)' }}
            >
              Færdig
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DemoFortaelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openFortael = useCallback(() => setOpen(true), []);
  return (
    <FortaelContext.Provider value={{ openFortael }}>
      {children}
      {open && <FortaelSheet onClose={() => setOpen(false)} />}
    </FortaelContext.Provider>
  );
}
