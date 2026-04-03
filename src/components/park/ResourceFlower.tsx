'use client';
// BUDR App – Flow 3: Ressourceblomsten
// PARK-metodik | KRAP-inspireret: Ressourceblomsten (#5a)
// Onboarding-flow — bygger borgerens ressourceprofil

import { useState, useEffect } from 'react';
import { getResourceProfile, upsertResourceProfile } from '@/lib/park-queries';
import { RESOURCE_PETALS } from '@/types/park';
import type { ResourceProfile } from '@/types/park';

interface Props {
  residentId: string;
  onComplete?: () => void;
}

export default function ResourceFlower({ residentId, onComplete }: Props) {
  const [petals, setPetals] = useState<Partial<ResourceProfile>>({});
  const [currentPetal, setCurrentPetal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    getResourceProfile(residentId).then((profile) => {
      if (profile) setPetals(profile);
      setInitialLoad(false);
    });
  }, [residentId]);

  const petal = RESOURCE_PETALS[currentPetal];
  const isLast = currentPetal === RESOURCE_PETALS.length - 1;
  const completedCount = RESOURCE_PETALS.filter((p) => petals[p.key]).length;

  async function handleSave() {
    setLoading(true);
    try {
      await upsertResourceProfile(residentId, petals);
      if (isLast) {
        onComplete?.();
      } else {
        setCurrentPetal((c) => c + 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (initialLoad) return <div className="park-loading">Henter din blomst...</div>;

  return (
    <div className="park-flow">
      {/* Blomst-visualisering */}
      <div className="park-flower">
        {RESOURCE_PETALS.map((p, i) => (
          <div
            key={p.key}
            className={`park-flower__petal park-flower__petal--${i} ${petals[p.key] ? 'filled' : ''} ${i === currentPetal ? 'active' : ''}`}
            onClick={() => setCurrentPetal(i)}
          >
            <span>{p.emoji}</span>
          </div>
        ))}
        <div className="park-flower__center">
          <span>
            {completedCount}/{RESOURCE_PETALS.length}
          </span>
        </div>
      </div>

      {/* Aktivt blad */}
      <div className="park-card">
        <div className="park-petal-header">
          <span className="park-petal-emoji">{petal.emoji}</span>
          <h2>{petal.label}</h2>
        </div>

        <textarea
          className="park-textarea"
          placeholder={`Skriv hvad der passer til: "${petal.label}"`}
          value={(petals[petal.key] as string) ?? ''}
          onChange={(e) => setPetals((prev) => ({ ...prev, [petal.key]: e.target.value }))}
          rows={4}
        />

        <div className="park-btn-row">
          {currentPetal > 0 && (
            <button
              className="park-btn park-btn--secondary"
              onClick={() => setCurrentPetal((c) => c - 1)}
            >
              Tilbage
            </button>
          )}
          <button className="park-btn park-btn--primary" disabled={loading} onClick={handleSave}>
            {loading ? 'Gemmer...' : isLast ? 'Afslut blomst' : 'Næste blad'}
          </button>
        </div>

        <p
          className="park-skip-link"
          onClick={() => setCurrentPetal((c) => Math.min(c + 1, RESOURCE_PETALS.length - 1))}
        >
          Spring over for nu
        </p>
      </div>
    </div>
  );
}
