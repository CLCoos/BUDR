'use client';
import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

const steps = [
  { id: 1, title: 'Situation', desc: 'Hvad skete der? Beskriv situationen.', field: 'situation' },
  { id: 2, title: 'Automatisk tanke', desc: 'Hvad tænkte du automatisk i situationen?', field: 'thought' },
  { id: 3, title: 'Følelse + intensitet', desc: 'Hvilken følelse mærkede du, og hvor stærk var den?', field: 'emotion' },
  { id: 4, title: 'Modtanke (AI)', desc: 'Lys har genereret en alternativ tanke til dig.', field: 'counter' },
  { id: 5, title: 'Ny vurdering', desc: 'Hvordan har du det nu? Giv din følelse en ny score.', field: 'new_emotion' },
];

const mockCounterThoughts = [
  'Det er forståeligt at du har det sådan, men husk at én svær dag ikke definerer dig. Du har klaret udfordringer før, og du har ressourcer til at navigere dette.',
  'Denne tanke er ikke nødvendigvis sandheden. Prøv at betragte situationen fra en andens perspektiv — hvad ville de sige til dig?',
  'Det lyder som om du holder dig selv op mod en meget høj standard. Hvad ville du sige til en god ven i din situation?',
];

export default function ThoughtCatcher() {
  const [step, setStep] = useState(1);
  const [situation, setSituation] = useState('');
  const [thought, setThought] = useState('');
  const [emotion, setEmotion] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [loadingAI, setLoadingAI] = useState(false);
  const [counterThought, setCounterThought] = useState('');
  const [newIntensity, setNewIntensity] = useState(3);
  const [saved, setSaved] = useState(false);

  const generateCounterThought = async () => {
    setLoadingAI(true);
    // Backend: POST /api/park/counter-thought with { situation, thought, emotion, intensity }
    await new Promise(r => setTimeout(r, 1800));
    setCounterThought(mockCounterThoughts?.[Math.floor(Math.random() * mockCounterThoughts?.length)]);
    setLoadingAI(false);
  };

  const handleNext = async () => {
    if (step === 3) {
      await generateCounterThought();
    }
    if (step < 5) setStep(step + 1);
  };

  const handleSave = () => {
    // Backend: INSERT INTO park_thought_catch (situation, automatic_thought, emotion, intensity, counter_thought, new_intensity, user_id)
    setSaved(true);
    toast?.success('Tankefanger gemt 🧠');
  };

  if (saved) {
    return (
      <div className="bg-white rounded-lg p-6 text-center border border-gray-100">
        <div className="text-4xl mb-3">🧠</div>
        <div className="font-semibold text-gray-800 mb-1">Godt arbejde, Anders!</div>
        <div className="text-sm text-gray-500 mb-4">Du har gennemført en tankefanger-øvelse. Intensiteten gik fra {intensity} til {newIntensity}.</div>
        <div className="flex justify-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums text-red-400">{intensity}</div>
            <div className="text-xs text-gray-400">Før</div>
          </div>
          <div className="text-2xl text-gray-300">→</div>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums text-green-500">{newIntensity}</div>
            <div className="text-xs text-gray-400">Efter</div>
          </div>
        </div>
        <button
          onClick={() => { setSaved(false); setStep(1); setSituation(''); setThought(''); setEmotion(''); setCounterThought(''); }}
          className="mt-5 text-sm text-[#7F77DD] hover:underline"
        >
          Start ny tankefanger
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps?.map(s => (
          <div key={`step-indicator-${s?.id}`} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step > s?.id ? 'bg-[#7F77DD] text-white' :
              step === s?.id ? 'bg-[#7F77DD] text-white ring-2 ring-[#7F77DD]/30': 'bg-gray-200 text-gray-400'
            }`}>
              {step > s?.id ? <Check size={10} /> : s?.id}
            </div>
            {s?.id < 5 && <div className={`flex-1 h-0.5 ${step > s?.id ? 'bg-[#7F77DD]' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
      {/* Step card */}
      <div className="bg-white rounded-lg p-5 border border-gray-100">
        <div className="text-xs font-semibold text-[#7F77DD] uppercase tracking-wider mb-1">Trin {step} / 5</div>
        <div className="font-semibold text-gray-800 mb-1">{steps?.[step-1]?.title}</div>
        <div className="text-xs text-gray-500 mb-4">{steps?.[step-1]?.desc}</div>

        {step === 1 && (
          <textarea
            value={situation}
            onChange={e => setSituation(e?.target?.value)}
            placeholder="F.eks. 'Jeg var til møde og sagde noget forkert...'"
            className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:border-[#7F77DD] transition-colors"
            rows={4}
          />
        )}

        {step === 2 && (
          <textarea
            value={thought}
            onChange={e => setThought(e?.target?.value)}
            placeholder="F.eks. 'Alle tænker at jeg er dum...'"
            className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:border-[#7F77DD] transition-colors"
            rows={4}
          />
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Følelse</label>
              <input
                value={emotion}
                onChange={e => setEmotion(e?.target?.value)}
                placeholder="F.eks. skam, angst, vrede..."
                className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:border-[#7F77DD] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Intensitet: <span className="font-bold text-[#7F77DD]">{intensity}/10</span></label>
              <input
                type="range" min={1} max={10} value={intensity}
                onChange={e => setIntensity(Number(e?.target?.value))}
                className="w-full accent-[#7F77DD]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Svag</span><span>Meget stærk</span>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            {loadingAI ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 size={24} className="animate-spin text-[#7F77DD]" />
                <div className="text-sm text-gray-500">Lys genererer en modtanke...</div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 bg-[#F5F4FF] rounded-lg p-4">
                  <div className="w-6 h-6 rounded-full bg-[#7F77DD] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={12} className="text-white" />
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">{counterThought}</div>
                </div>
                <div className="text-xs text-gray-400">Genereret af Lys AI · Du kan gemme eller springe over</div>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">
              Ny intensitet af {emotion || 'følelsen'}: <span className="font-bold text-[#7F77DD]">{newIntensity}/10</span>
            </label>
            <input
              type="range" min={1} max={10} value={newIntensity}
              onChange={e => setNewIntensity(Number(e?.target?.value))}
              className="w-full accent-[#7F77DD]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1 mb-4">
              <span>Svag</span><span>Meget stærk</span>
            </div>
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
              newIntensity < intensity ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {newIntensity < intensity
                ? `✅ Intensiteten faldt med ${intensity - newIntensity} point. Godt arbejde!`
                : `💛 Det er okay — det tager tid. Lys er her for dig.`
              }
            </div>
          </div>
        )}
      </div>
      {/* Nav buttons */}
      <div className="flex gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all"
          >
            <ChevronLeft size={16} /> Tilbage
          </button>
        )}
        {step < 5 ? (
          <button
            onClick={handleNext}
            disabled={
              (step === 1 && !situation?.trim()) ||
              (step === 2 && !thought?.trim()) ||
              (step === 3 && !emotion?.trim()) ||
              loadingAI
            }
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#7F77DD' }}
          >
            {loadingAI ? <Loader2 size={14} className="animate-spin" /> : null}
            Næste <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-95"
            style={{ backgroundColor: '#7F77DD' }}
          >
            Gem tankefanger ✓
          </button>
        )}
      </div>
    </div>
  );
}