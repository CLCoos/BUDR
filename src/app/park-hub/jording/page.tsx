'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Exercise = 'menu' | 'breath' | 'sense' | 'muscle';

export default function JordingPage() {
  const router = useRouter();
  const [active, setActive] = useState<Exercise>('menu');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;
      const { data } = await supabase
        .from('care_residents')
        .select('simple_mode')
        .eq('user_id', user.id)
        .maybeSingle();
      const isSimpleMode = Boolean((data as { simple_mode?: boolean } | null)?.simple_mode);
      if (!cancelled && isSimpleMode) {
        router.replace('/park-hub');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto max-w-lg min-h-dvh bg-[#F7F5F1] text-[#1A1814] px-5 py-5">
      <button
        type="button"
        onClick={() => (active === 'menu' ? router.back() : setActive('menu'))}
        className="mb-4 text-sm font-semibold text-[#2D5BE3]"
      >
        ← Tilbage
      </button>

      <h1
        className="text-3xl leading-tight"
        style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}
      >
        Ro-øvelser
      </h1>
      <p className="text-sm text-[#6B6459] mt-1 mb-4">
        Disse øvelser kan hjælpe dig til at finde ro
      </p>

      {active === 'menu' && (
        <div className="space-y-3">
          {[
            {
              id: 'breath' as const,
              icon: '🌬️',
              title: 'Vejrtrækning',
              desc: 'Brug åndedrættet til at finde ro',
            },
            {
              id: 'sense' as const,
              icon: '👁️',
              title: '5-4-3-2-1 Sansning',
              desc: 'Bring dig selv tilbage til nuet',
            },
            {
              id: 'muscle' as const,
              icon: '💪',
              title: 'Slip spændinger',
              desc: 'Afspænd kroppen trin for trin',
            },
          ].map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setActive(e.id)}
              className="w-full rounded-2xl border border-[#E8E3DA] bg-white px-4 py-4 text-left"
            >
              <p className="text-2xl">{e.icon}</p>
              <p className="text-sm font-semibold mt-1">{e.title}</p>
              <p className="text-xs text-[#6B6459]">{e.desc}</p>
              <p className="text-xs text-[#2D5BE3] mt-1 font-semibold">Start øvelse →</p>
            </button>
          ))}
        </div>
      )}

      {active === 'breath' && (
        <section className="rounded-2xl border border-[#E8E3DA] bg-white px-4 py-5">
          <p className="text-sm font-semibold mb-3">Vejrtrækning</p>
          <p className="text-sm text-[#6B6459]">
            Træk vejret ind i 4 sekunder, hold i 4 sekunder, pust ud i 6 sekunder. Gentag i dit
            tempo.
          </p>
        </section>
      )}

      {active === 'sense' && (
        <section className="rounded-2xl border border-[#E8E3DA] bg-white px-4 py-5">
          <p className="text-sm font-semibold mb-3">5-4-3-2-1 Sansning</p>
          <ul className="text-sm text-[#6B6459] space-y-1">
            <li>5 ting du kan se</li>
            <li>4 ting du kan høre</li>
            <li>3 ting du kan mærke</li>
            <li>2 ting du kan lugte</li>
            <li>1 ting du kan smage</li>
          </ul>
        </section>
      )}

      {active === 'muscle' && (
        <section className="rounded-2xl border border-[#E8E3DA] bg-white px-4 py-5">
          <p className="text-sm font-semibold mb-3">Slip spændinger</p>
          <p className="text-sm text-[#6B6459]">
            Spænd én muskelgruppe i 5 sekunder, hold kort, og slip derefter helt i 8 sekunder.
            Gentag for skuldre, arme, ansigt, mave og ben.
          </p>
        </section>
      )}
    </main>
  );
}
