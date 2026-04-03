'use client';

import React, { useEffect, useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { createClient } from '@/lib/supabase/client';
import DailyCheckin from './DailyCheckin';
import ResourceRegistration from './ResourceRegistration';
import GoalScaling from './GoalScaling';
import ThoughtCheck from './ThoughtCheck';

const supabase = createClient();

export default function KRAPFlow() {
  const [activeTab, setActiveTab] = useState(1);
  const [profileId, setProfileId] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setProfileLoading(true);
      setProfileError('');
      try {
        if (!supabase) throw new Error('Supabase er ikke konfigureret.');

        // Brug lokal session først (kræver ikke netværkskald), så UI'en ikke “hænger”.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userIdFromSession = session?.user?.id;
        if (!userIdFromSession) {
          // Fallback: prøv getUser hvis session ikke findes (kræver netværkskald).
          const { data: { user } = {}, error: userErr } = await supabase.auth.getUser();
          if (userErr) throw userErr;
          if (!user?.id) throw new Error('Du er ikke logget ind.');
          if (mounted) setProfileId(user.id);
          return;
        }

        // I denne app matcher user_profiles.id = auth.uid(), så profil-ID er samme som bruger-ID.
        if (mounted) setProfileId(userIdFromSession);
      } catch (e) {
        if (mounted)
          setProfileError(e instanceof Error ? e.message : 'Kunne ikke starte KRAP-flow.');
      } finally {
        if (mounted) setProfileLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen gradient-midnight pb-28">
      <div className="sticky top-0 z-20 bg-midnight-900/90 backdrop-blur-xl border-b border-midnight-700/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold text-midnight-50">
                Mit udviklingsværktøj
              </h1>
              <p className="text-xs text-midnight-400 mt-0.5">
                En varm måde at registrere, skalere og tænke hjælpsomt på.
              </p>
            </div>
            <div className="hidden sm:block text-xs text-midnight-400">
              Dine data gemmes i dit eget tempo.
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 1, label: 'Daglig registrering' },
              { id: 2, label: 'Ugentlige ressourcer' },
              { id: 3, label: 'Mine mål' },
              { id: 4, label: 'Tanketjek' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-2xl border text-sm font-semibold whitespace-nowrap transition-all active:scale-[0.99] ${
                  activeTab === tab.id
                    ? 'bg-sunrise-400/15 border-sunrise-400/35 text-sunrise-200'
                    : 'bg-midnight-800/30 border-midnight-700/40 text-midnight-300 hover:bg-midnight-800/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {profileLoading ? (
          <div className="rounded-3xl border border-midnight-700/40 bg-midnight-800/30 p-6">
            <p className="text-sm text-midnight-300">Indlæser din profil…</p>
          </div>
        ) : profileError ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6">
            <p className="text-sm text-rose-100 font-semibold">
              Kunne ikke starte dit udviklingsværktøj
            </p>
            <p className="text-sm text-rose-200 mt-2">{profileError}</p>
          </div>
        ) : (
          <>
            {activeTab === 1 ? <DailyCheckin supabase={supabase} profileId={profileId} /> : null}
            {activeTab === 2 ? (
              <ResourceRegistration supabase={supabase} profileId={profileId} />
            ) : null}
            {activeTab === 3 ? <GoalScaling supabase={supabase} profileId={profileId} /> : null}
            {activeTab === 4 ? <ThoughtCheck supabase={supabase} profileId={profileId} /> : null}

            <div className="rounded-3xl border border-midnight-700/40 bg-midnight-800/25 p-4">
              <p className="text-xs text-midnight-400 leading-relaxed">
                Husk: Du kan altid starte i det små. Det vigtigste er at være venlig mod dig selv,
                mens du registrerer.
              </p>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
