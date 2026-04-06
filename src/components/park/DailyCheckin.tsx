'use client';
// BUDR App – Flow 1: Daglig check-in
// PARK-metodik | KRAP-inspireret: Skalering (#23) + Trafiklys (#28)

import { useState } from 'react';
import { submitCheckin } from '@/lib/park-queries';
import type { TrafficLight } from '@/types/park';

const MOOD_LABELS = [
  'Meget svært',
  'Svært',
  'Lidt svært',
  'Okay',
  'Nogenlunde',
  'Fint',
  'Godt',
  'Rigtigt godt',
  'Super godt',
  'Fantastisk',
];

const TRAFFIC_OPTIONS: { value: TrafficLight; label: string; desc: string; color: string }[] = [
  { value: 'green', label: '🟢 Grøn', desc: 'Det går godt. Jeg har det fint.', color: '#22c55e' },
  {
    value: 'yellow',
    label: '🟡 Gul',
    desc: 'Det er lidt svært. Jeg har brug for lidt støtte.',
    color: '#eab308',
  },
  {
    value: 'red',
    label: '🔴 Rød',
    desc: 'Det er meget svært. Jeg har brug for hjælp nu.',
    color: '#ef4444',
  },
];

interface Props {
  residentId: string;
  onComplete?: () => void;
}

export default function DailyCheckin({ residentId, onComplete }: Props) {
  const [step, setStep] = useState<'score' | 'traffic' | 'text' | 'done'>('score');
  const [score, setScore] = useState<number>(5);
  const [traffic, setTraffic] = useState<TrafficLight | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const moodLabel = MOOD_LABELS[score - 1];

  async function handleSubmit() {
    if (!traffic) return;
    setLoading(true);
    try {
      await submitCheckin({
        resident_id: residentId,
        score,
        mood_label: moodLabel,
        free_text: text || undefined,
        traffic_light: traffic,
      });
      setStep('done');
      onComplete?.();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="park-card park-card--center">
        <div className="park-done-icon">✓</div>
        <h2>Tak for i dag</h2>
        <p>Din check-in er gemt.</p>
      </div>
    );
  }

  return (
    <div className="park-flow">
      <div className="park-flow__progress">
        {['score', 'traffic', 'text'].map((s, i) => (
          <div
            key={s}
            className={`park-flow__dot ${step === s ? 'active' : ['score', 'traffic', 'text'].indexOf(step) > i ? 'done' : ''}`}
          />
        ))}
      </div>

      {step === 'score' && (
        <div className="park-card">
          <h2>Hvordan har du det i dag?</h2>
          <p className="park-subtitle">Vælg et tal fra 1 til 10</p>

          <div className="park-score-display">
            <span className="park-score-number">{score}</span>
            <span className="park-score-label">{moodLabel}</span>
          </div>

          <input
            type="range"
            min={1}
            max={10}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="park-slider"
          />

          <div className="park-slider-labels">
            <span>1</span>
            <span>10</span>
          </div>

          <button className="park-btn park-btn--primary" onClick={() => setStep('traffic')}>
            Videre
          </button>
        </div>
      )}

      {step === 'traffic' && (
        <div className="park-card">
          <h2>Hvilket lys passer bedst?</h2>
          <p className="park-subtitle">Vælg det der føles rigtigt</p>

          <div className="park-traffic-options">
            {TRAFFIC_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`park-traffic-btn ${traffic === opt.value ? 'selected' : ''}`}
                style={{ '--traffic-color': opt.color } as React.CSSProperties}
                onClick={() => setTraffic(opt.value)}
              >
                <span className="park-traffic-label">{opt.label}</span>
                <span className="park-traffic-desc">{opt.desc}</span>
              </button>
            ))}
          </div>

          {traffic === 'red' && (
            <div className="park-alert-notice">
              Dit personale vil blive orienteret om, at du har det svært.
            </div>
          )}

          <div className="park-btn-row">
            <button className="park-btn park-btn--secondary" onClick={() => setStep('score')}>
              Tilbage
            </button>
            <button
              className="park-btn park-btn--primary"
              disabled={!traffic}
              onClick={() => setStep('text')}
            >
              Videre
            </button>
          </div>
        </div>
      )}

      {step === 'text' && (
        <div className="park-card">
          <h2>Vil du fortælle mere?</h2>
          <p className="park-subtitle">Det er frivilligt — skriv hvad du har lyst til</p>

          <textarea
            className="park-textarea"
            placeholder="Hvad fylder mest for dig i dag?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
          />

          <div className="park-btn-row">
            <button className="park-btn park-btn--secondary" onClick={() => setStep('traffic')}>
              Tilbage
            </button>
            <button
              className="park-btn park-btn--primary"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Gemmer...' : 'Gem check-in'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
