'use client';
import React, { useState } from 'react';
import { Check, Smile, Frown } from 'lucide-react';
import { toast } from 'sonner';

const moodEmojis = ['😔','😟','😕','😐','🙂','😊','😄','😃','🤩','🥳'];

export default function DailyCheckin() {
  const [mood, setMood] = useState(6);
  const [traffic, setTraffic] = useState<'groen' | 'gul' | 'roed' | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!traffic) {
      toast.error('Vælg venligst en trafiklys-farve');
      return;
    }
    setSaved(true);
    // Backend: INSERT INTO park_daily_checkin (user_id, score, traffic_light, note, created_at)
    toast.success('Check-in gemt! Godt klaret 🌟');
  };

  if (saved) {
    return (
      <div className="bg-white rounded-lg p-6 text-center border border-gray-100">
        <div className="text-4xl mb-3">✅</div>
        <div className="font-semibold text-gray-800 mb-1">Check-in registreret!</div>
        <div className="text-sm text-gray-500 mb-4">Du har det {moodEmojis[mood - 1]} i dag — stemning {mood}/10</div>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          traffic === 'groen' ? 'bg-green-100 text-green-700' :
          traffic === 'gul'? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            traffic === 'groen' ? 'bg-green-500' :
            traffic === 'gul'? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          {traffic === 'groen' ? 'Grøn' : traffic === 'gul' ? 'Gul' : 'Rød'}
        </div>
        <button
          onClick={() => setSaved(false)}
          className="mt-4 block w-full text-sm text-[#7F77DD] hover:underline"
        >
          Ret check-in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mood slider */}
      <div className="bg-white rounded-lg p-5 border border-gray-100">
        <div className="text-sm font-semibold text-gray-700 mb-1">Hvordan har du det?</div>
        <div className="text-xs text-gray-500 mb-4">Skala 1–10 · Vælg et tal</div>

        <div className="flex items-center justify-between mb-3">
          <Frown size={20} className="text-gray-400" />
          <span className="text-3xl font-bold tabular-nums" style={{ color: '#7F77DD' }}>{mood}</span>
          <Smile size={20} className="text-gray-400" />
        </div>

        <input
          type="range"
          min={1}
          max={10}
          value={mood}
          onChange={e => setMood(Number(e.target.value))}
          className="w-full accent-[#7F77DD] h-2 rounded-full cursor-pointer"
        />

        <div className="flex justify-between mt-2">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={`mood-${n}`}
              onClick={() => setMood(n)}
              className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                mood === n
                  ? 'bg-[#7F77DD] text-white scale-110'
                  : 'bg-gray-100 text-gray-500 hover:bg-[#7F77DD]/20'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="mt-3 text-center text-2xl">{moodEmojis[mood - 1]}</div>
      </div>

      {/* Traffic light */}
      <div className="bg-white rounded-lg p-5 border border-gray-100">
        <div className="text-sm font-semibold text-gray-700 mb-1">Trafiklys</div>
        <div className="text-xs text-gray-500 mb-4">Hvordan vil du beskrive din dag overordnet?</div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'groen', label: 'Grøn', sublabel: 'Det går godt', color: '#22C55E', bg: '#F0FDF4', border: '#86EFAC' },
            { key: 'gul', label: 'Gul', sublabel: 'Lidt udfordret', color: '#EAB308', bg: '#FEFCE8', border: '#FDE047' },
            { key: 'roed', label: 'Rød', sublabel: 'Har det svært', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
          ].map(opt => (
            <button
              key={`traffic-${opt.key}`}
              onClick={() => setTraffic(opt.key as 'groen' | 'gul' | 'roed')}
              className={`flex flex-col items-center gap-2 py-4 px-2 rounded-lg border-2 transition-all ${
                traffic === opt.key
                  ? 'scale-105 shadow-sm'
                  : 'hover:scale-102 opacity-70 hover:opacity-100'
              }`}
              style={{
                borderColor: traffic === opt.key ? opt.color : opt.border,
                backgroundColor: opt.bg,
              }}
            >
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: opt.color }} />
              <div className="text-xs font-semibold" style={{ color: opt.color }}>{opt.label}</div>
              <div className="text-xs text-gray-500 text-center leading-tight">{opt.sublabel}</div>
              {traffic === opt.key && <Check size={12} style={{ color: opt.color }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="bg-white rounded-lg p-5 border border-gray-100">
        <div className="text-sm font-semibold text-gray-700 mb-1">Tilføj en note (valgfri)</div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Hvad tænker du på i dag? Hvad skete der?"
          className="w-full text-sm text-gray-700 placeholder-gray-400 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:border-[#7F77DD] transition-colors"
          rows={3}
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3.5 rounded-lg font-semibold text-white text-sm transition-all active:scale-95"
        style={{ backgroundColor: '#7F77DD' }}
      >
        Gem check-in
      </button>
    </div>
  );
}