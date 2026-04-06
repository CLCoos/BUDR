'use client';
// BUDR App – Flow 2: Tankefanger
// PARK-metodik | KRAP-inspireret: Tanketjek (#24) + Tanker og modtanker (#45a)
// AI-guidet kognitivt omformningsflow

import { useState } from 'react';
import { submitThoughtCatch } from '@/lib/park-queries';

type Step = 'situation' | 'thought' | 'emotion' | 'counter' | 'outcome' | 'done';

interface Props {
  residentId: string;
  onComplete?: () => void;
}

const EMOTION_OPTIONS = [
  { label: 'Ked af det', emoji: '😢' },
  { label: 'Vred', emoji: '😠' },
  { label: 'Angst', emoji: '😰' },
  { label: 'Skamfuld', emoji: '😳' },
  { label: 'Ensom', emoji: '🫥' },
  { label: 'Frustreret', emoji: '😤' },
  { label: 'Bange', emoji: '😨' },
  { label: 'Overvældet', emoji: '🌊' },
];

export default function ThoughtCatcher({ residentId, onComplete }: Props) {
  const [step, setStep] = useState<Step>('situation');
  const [situation, setSituation] = useState('');
  const [thought, setThought] = useState('');
  const [emotion, setEmotion] = useState('');
  const [emotionScore, setEmotionScore] = useState(5);
  const [counterThought, setCounterThought] = useState('');
  const [outcomeScore, setOutcomeScore] = useState(5);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const steps: Step[] = ['situation', 'thought', 'emotion', 'counter', 'outcome'];
  const stepIndex = steps.indexOf(step);

  async function getAiSuggestion() {
    if (!thought || !situation) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/park/counter-thought', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation, thought, emotion }),
      });
      const data = await res.json();
      setCounterThought(data.suggestion ?? '');
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await submitThoughtCatch({
        resident_id: residentId,
        situation,
        automatic_thought: thought,
        emotion: emotion || undefined,
        emotion_score: emotionScore,
        counter_thought: counterThought || undefined,
        outcome_score: outcomeScore,
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
    const improvement = outcomeScore - emotionScore;
    return (
      <div className="park-card park-card--center">
        <div className="park-done-icon">✓</div>
        <h2>Godt klaret</h2>
        {improvement > 0 && (
          <p>
            Din tanke skiftede med <strong>{improvement} point</strong> — det er en forskel.
          </p>
        )}
        <p>Din tankefanger er gemt.</p>
      </div>
    );
  }

  return (
    <div className="park-flow">
      <div className="park-flow__progress">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`park-flow__dot ${step === s ? 'active' : stepIndex > i ? 'done' : ''}`}
          />
        ))}
      </div>

      {step === 'situation' && (
        <div className="park-card">
          <div className="park-step-label">Trin 1 af 5</div>
          <h2>Hvad skete der?</h2>
          <p className="park-subtitle">Beskriv situationen kort — hvad foregik der?</p>
          <textarea
            className="park-textarea"
            placeholder="F.eks. 'Jeg sad alene til frokost og ingen kom hen til mig'"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            rows={3}
          />
          <button
            className="park-btn park-btn--primary"
            disabled={!situation.trim()}
            onClick={() => setStep('thought')}
          >
            Videre
          </button>
        </div>
      )}

      {step === 'thought' && (
        <div className="park-card">
          <div className="park-step-label">Trin 2 af 5</div>
          <h2>Hvad tænkte du?</h2>
          <p className="park-subtitle">Den første tanke der dukkede op</p>
          <div className="park-context-box">{situation}</div>
          <textarea
            className="park-textarea"
            placeholder="F.eks. 'Alle er ligeglade med mig'"
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            rows={3}
          />
          <div className="park-btn-row">
            <button className="park-btn park-btn--secondary" onClick={() => setStep('situation')}>
              Tilbage
            </button>
            <button
              className="park-btn park-btn--primary"
              disabled={!thought.trim()}
              onClick={() => setStep('emotion')}
            >
              Videre
            </button>
          </div>
        </div>
      )}

      {step === 'emotion' && (
        <div className="park-card">
          <div className="park-step-label">Trin 3 af 5</div>
          <h2>Hvilken følelse?</h2>
          <div className="park-emotion-grid">
            {EMOTION_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                className={`park-emotion-btn ${emotion === opt.label ? 'selected' : ''}`}
                onClick={() => setEmotion(opt.label)}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          {emotion && (
            <>
              <p className="park-subtitle">
                Hvor stærk er følelsen? <strong>{emotionScore}/10</strong>
              </p>
              <input
                type="range"
                min={1}
                max={10}
                value={emotionScore}
                onChange={(e) => setEmotionScore(Number(e.target.value))}
                className="park-slider"
              />
            </>
          )}
          <div className="park-btn-row">
            <button className="park-btn park-btn--secondary" onClick={() => setStep('thought')}>
              Tilbage
            </button>
            <button
              className="park-btn park-btn--primary"
              disabled={!emotion}
              onClick={() => setStep('counter')}
            >
              Videre
            </button>
          </div>
        </div>
      )}

      {step === 'counter' && (
        <div className="park-card">
          <div className="park-step-label">Trin 4 af 5</div>
          <h2>En anden tanke</h2>
          <p className="park-subtitle">Hvad kunne du sige til dig selv i stedet?</p>
          <div className="park-thought-box">
            <span className="park-thought-label">Din tanke:</span>
            <span>{thought}</span>
          </div>
          <textarea
            className="park-textarea"
            placeholder="En mere hjælpsom tanke om situationen..."
            value={counterThought}
            onChange={(e) => setCounterThought(e.target.value)}
            rows={3}
          />
          <button
            className="park-btn park-btn--ghost"
            disabled={aiLoading}
            onClick={getAiSuggestion}
          >
            {aiLoading ? 'Tænker...' : '✨ Få et forslag fra Lys'}
          </button>
          <div className="park-btn-row">
            <button className="park-btn park-btn--secondary" onClick={() => setStep('emotion')}>
              Tilbage
            </button>
            <button className="park-btn park-btn--primary" onClick={() => setStep('outcome')}>
              Videre
            </button>
          </div>
        </div>
      )}

      {step === 'outcome' && (
        <div className="park-card">
          <div className="park-step-label">Trin 5 af 5</div>
          <h2>Hvordan har du det nu?</h2>
          <p className="park-subtitle">
            Samme følelse som før — men nu efter den nye tanke. <strong>{outcomeScore}/10</strong>
          </p>
          <input
            type="range"
            min={1}
            max={10}
            value={outcomeScore}
            onChange={(e) => setOutcomeScore(Number(e.target.value))}
            className="park-slider"
          />
          <div className="park-btn-row">
            <button className="park-btn park-btn--secondary" onClick={() => setStep('counter')}>
              Tilbage
            </button>
            <button
              className="park-btn park-btn--primary"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Gemmer...' : 'Gem tankefanger'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
