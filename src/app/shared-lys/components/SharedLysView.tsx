'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Lys, { LysMood } from '@/components/Lys';
import BottomNav from '@/components/BottomNav';

interface LysEvent {
  id: string;
  sender_id: string;
  event_type: 'color' | 'message';
  color?: string;
  message?: string;
  created_at: string;
}

const colorOptions: { color: string; mood: LysMood; label: string }[] = [
  { color: '#A78BFA', mood: 'calm', label: 'Rolig' },
  { color: '#FB923C', mood: 'energized', label: 'Energi' },
  { color: '#60A5FA', mood: 'tired', label: 'Hvile' },
  { color: '#34D399', mood: 'happy', label: 'Glad' },
  { color: '#F87171', mood: 'sad', label: 'Trist' },
  { color: '#67E8F9', mood: 'focused', label: 'Fokus' },
];

const encouragements = [
  'Du er ikke alene 💜',
  'Jeg tænker på dig 🌟',
  'Du klarer det 💪',
  'Bare ét skridt 🌱',
  'Jeg er her 🫂',
  'Du er stærk ✨',
];

export default function SharedLysView() {
  const [sessionCode, setSessionCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<LysEvent[]>([]);
  const [activeMood, setActiveMood] = useState<LysMood>('calm');
  const [activeColor, setActiveColor] = useState('#A78BFA');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const mountedRef = useRef(true);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    mountedRef.current = true;
    // Get current user
    const getUser = async () => {
      const supabase = supabaseRef.current;
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && mountedRef.current) setCurrentUserId(user.id);
    };
    getUser();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const generateCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setSessionCode(code);
    return code;
  };

  const createSession = async () => {
    setLoading(true);
    setError('');
    const code = generateCode();
    try {
      const supabase = supabaseRef.current;
      if (!supabase || !currentUserId) {
        // Demo mode
        setSessionId('demo-session');
        setJoined(true);
        setLoading(false);
        return;
      }
      const { data, error: err } = await supabase
        .from('shared_lys_sessions')
        .insert({ user_id: currentUserId, session_code: code, is_active: true })
        .select()
        .single();
      if (err) throw err;
      if (data && mountedRef.current) {
        setSessionId(data.id);
        setJoined(true);
        subscribeToSession(data.id);
      }
    } catch {
      setError('Kunne ikke oprette session. Prøv igen.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const joinSession = async () => {
    if (!inputCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const supabase = supabaseRef.current;
      if (!supabase || !currentUserId) {
        setSessionCode(inputCode.toUpperCase());
        setSessionId('demo-session');
        setJoined(true);
        setLoading(false);
        return;
      }
      const { data: session, error: err } = await supabase
        .from('shared_lys_sessions')
        .select('*')
        .eq('session_code', inputCode.toUpperCase())
        .eq('is_active', true)
        .single();
      if (err || !session) {
        setError('Ugyldig kode. Tjek koden og prøv igen.');
        setLoading(false);
        return;
      }
      await supabase
        .from('shared_lys_sessions')
        .update({ support_user_id: currentUserId })
        .eq('id', session.id);
      if (mountedRef.current) {
        setSessionCode(session.session_code);
        setSessionId(session.id);
        setJoined(true);
        subscribeToSession(session.id);
      }
    } catch {
      setError('Kunne ikke tilslutte session.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const subscribeToSession = useCallback((sid: string) => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    const channel = supabase
      .channel(`shared_lys_${sid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shared_lys_events',
          filter: `session_id=eq.${sid}`,
        },
        (payload: { new: LysEvent }) => {
          if (mountedRef.current) {
            setEvents((prev) => [...prev, payload.new]);
            if (payload.new.color) {
              const found = colorOptions.find((c) => c.color === payload.new.color);
              if (found) {
                setActiveMood(found.mood);
                setActiveColor(found.color);
              }
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendColor = async (color: string, mood: LysMood) => {
    setActiveMood(mood);
    setActiveColor(color);
    if (!sessionId || !currentUserId) return;
    const supabase = supabaseRef.current;
    if (!supabase) return;
    await supabase.from('shared_lys_events').insert({
      session_id: sessionId,
      sender_id: currentUserId,
      event_type: 'color',
      color,
    });
  };

  const sendEncouragement = async (message: string) => {
    setSendingMessage(true);
    if (sessionId && currentUserId) {
      const supabase = supabaseRef.current;
      if (supabase) {
        await supabase.from('shared_lys_events').insert({
          session_id: sessionId,
          sender_id: currentUserId,
          event_type: 'message',
          message,
        });
      }
    }
    // Show locally too
    const localEvent: LysEvent = {
      id: Date.now().toString(),
      sender_id: currentUserId || 'local',
      event_type: 'message',
      message,
      created_at: new Date().toISOString(),
    };
    setEvents((prev) => [...prev, localEvent]);
    setTimeout(() => {
      if (mountedRef.current) setSendingMessage(false);
    }, 500);
  };

  const recentMessages = events.filter((e) => e.event_type === 'message').slice(-5);

  return (
    <div className="min-h-screen gradient-midnight pb-32">
      <div className="sticky top-0 z-20 bg-midnight-900/90 backdrop-blur-xl border-b border-midnight-700/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="font-display text-xl font-bold text-midnight-50">🫂 Delt Lys</h1>
          <p className="text-xs text-midnight-400 mt-0.5">
            Del Lys med en støtteperson — i realtid
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {!joined ? (
          <div className="space-y-4">
            <div className="bg-midnight-800/50 rounded-3xl border border-midnight-700/50 p-5 text-center">
              <div className="text-4xl mb-3">🫂</div>
              <h2 className="font-display text-lg font-bold text-midnight-50 mb-2">
                Delt Lys-kompagnon
              </h2>
              <p className="text-sm text-midnight-400 leading-relaxed">
                Del din Lys med en støtteperson. I kan begge sende farver og opmuntringer — og se
                det i realtid.
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3">
                <p className="text-sm text-rose-300">{error}</p>
              </div>
            )}

            <button
              onClick={createSession}
              disabled={loading}
              className="w-full bg-aurora-violet/15 border border-aurora-violet/30 rounded-2xl py-4 text-sm font-semibold text-purple-300 hover:bg-aurora-violet/20 transition-all duration-200 disabled:opacity-50 min-h-[52px]"
            >
              {loading ? '...' : '✨ Opret ny delt session'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-midnight-700" />
              <span className="text-xs text-midnight-500">eller</span>
              <div className="flex-1 h-px bg-midnight-700" />
            </div>

            <div className="flex gap-2">
              <input
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Kode (fx ABC123)"
                maxLength={6}
                className="flex-1 bg-midnight-800 border border-midnight-600 rounded-xl px-3 py-3 text-sm text-midnight-100 placeholder-midnight-600 focus:outline-none focus:border-aurora-violet/50 font-mono tracking-widest min-h-[48px]"
              />
              <button
                onClick={joinSession}
                disabled={loading || !inputCode.trim()}
                className="bg-sunrise-400/20 border border-sunrise-400/30 rounded-xl px-4 py-3 text-sm font-semibold text-sunrise-300 hover:bg-sunrise-400/25 transition-all duration-200 disabled:opacity-50 min-h-[48px] min-w-[80px]"
              >
                Tilslut
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Session code */}
            <div className="bg-midnight-800/50 rounded-2xl border border-midnight-700/50 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-midnight-400">Din session-kode:</p>
                <p className="font-mono text-2xl font-bold text-sunrise-300 tracking-widest">
                  {sessionCode}
                </p>
                <p className="text-xs text-midnight-500 mt-0.5">
                  Del denne kode med din støtteperson
                </p>
              </div>
              <div
                className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"
                title="Forbundet"
              />
            </div>

            {/* Shared Lys */}
            <div className="flex flex-col items-center py-4">
              <Lys mood={activeMood} size="xl" showMessage />
              <p className="text-xs text-midnight-400 mt-3">
                Lys reagerer på farver I sender hinanden
              </p>
            </div>

            {/* Color picker */}
            <div className="bg-midnight-800/50 rounded-2xl border border-midnight-700/50 p-4">
              <p className="text-xs text-midnight-400 font-semibold mb-3">Send en farve til Lys:</p>
              <div className="grid grid-cols-3 gap-2">
                {colorOptions.map(({ color, mood, label }) => (
                  <button
                    key={color}
                    onClick={() => sendColor(color, mood)}
                    className={`rounded-xl py-3 text-xs font-semibold transition-all duration-200 border ${
                      activeColor === color
                        ? 'border-white/30 scale-105'
                        : 'border-transparent hover:border-white/10'
                    }`}
                    style={{ background: `${color}20`, color }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Encouragements */}
            <div className="bg-midnight-800/50 rounded-2xl border border-midnight-700/50 p-4">
              <p className="text-xs text-midnight-400 font-semibold mb-3">Send en opmuntring:</p>
              <div className="grid grid-cols-2 gap-2">
                {encouragements.map((msg) => (
                  <button
                    key={msg}
                    onClick={() => sendEncouragement(msg)}
                    disabled={sendingMessage}
                    className="bg-midnight-700/50 border border-midnight-600/50 rounded-xl px-3 py-2 text-xs text-midnight-200 hover:border-aurora-violet/30 hover:text-purple-300 transition-all duration-200 disabled:opacity-50 text-left"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent messages */}
            {recentMessages.length > 0 && (
              <div className="bg-midnight-800/50 rounded-2xl border border-midnight-700/50 p-4">
                <p className="text-xs text-midnight-400 font-semibold mb-3">
                  💬 Seneste opmuntringer:
                </p>
                <div className="space-y-2">
                  {recentMessages.map((event) => (
                    <div
                      key={event.id}
                      className="bg-aurora-violet/10 border border-aurora-violet/20 rounded-xl px-3 py-2"
                    >
                      <p className="text-sm text-midnight-100">{event.message}</p>
                      <p className="text-xs text-midnight-500 mt-0.5">
                        {event.sender_id === currentUserId ? 'Dig' : 'Støtteperson'} ·{' '}
                        {new Date(event.created_at).toLocaleTimeString('da-DK', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
