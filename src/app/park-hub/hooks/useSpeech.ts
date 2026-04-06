'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
};

function getSpeechCtor(): (new () => SpeechRec) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeech() {
  const recRef = useRef<SpeechRec | null>(null);
  const accRef = useRef('');
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');

  const stopListening = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    accRef.current = '';
    setLiveTranscript('');
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor) return false;
    try {
      recRef.current?.abort?.();
    } catch {
      /* ignore */
    }
    accRef.current = '';
    setLiveTranscript('');
    const rec = new Ctor();
    rec.lang = 'da-DK';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: Event) => {
      const ev = event as unknown as {
        resultIndex: number;
        results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
      };
      let interim = '';
      let addFinal = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const t = r[0]?.transcript ?? '';
        if (r.isFinal) addFinal += t;
        else interim += t;
      }
      accRef.current += addFinal;
      setLiveTranscript((accRef.current + interim).trimStart());
    };
    rec.onerror = () => stopListening();
    rec.onend = () => {
      setIsListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
      return true;
    } catch {
      return false;
    }
  }, [stopListening]);

  useEffect(() => () => stopListening(), [stopListening]);

  const speak = useCallback((text: string, reducedMotion: boolean) => {
    if (typeof window === 'undefined' || !text.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'da-DK';
    const voices = window.speechSynthesis.getVoices();
    const da = voices.find(v => v.lang.startsWith('da')) ?? voices.find(v => v.lang.includes('DK'));
    if (da) u.voice = da;
    u.rate = reducedMotion ? 1 : 0.95;
    window.speechSynthesis.speak(u);
  }, []);

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  return { isListening, liveTranscript, startListening, stopListening, clearTranscript, speak };
}
