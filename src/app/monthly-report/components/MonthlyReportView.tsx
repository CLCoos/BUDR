'use client';

import React, { useState, useEffect, useRef } from 'react';
import BottomNav from '@/components/BottomNav';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';

interface ReportData {
  month: string;
  avgMood: number;
  avgSleep: number;
  avgEnergy: number;
  checkInDays: number;
  totalDays: number;
  topMoods: string[];
  journalEntries: number;
  challengesCompleted: number;
  krapHighlights: string[];
}

const demoData: ReportData = {
  month: new Date().toLocaleDateString('da-DK', { month: 'long', year: 'numeric' }),
  avgMood: 6.4,
  avgSleep: 3.2,
  avgEnergy: 3.1,
  checkInDays: 18,
  totalDays: 30,
  topMoods: ['rolig', 'glad', 'træt'],
  journalEntries: 12,
  challengesCompleted: 47,
  krapHighlights: [
    'Spænding i skuldrene nævnt 8 gange',
    'Sociale aktiviteter forbedrer humøret markant',
    'Søvnkvalitet påvirker energi næste dag',
  ],
};

export default function MonthlyReportView() {
  const [reportData] = useState<ReportData>(demoData);
  const [aiSummary, setAiSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'ANTHROPIC',
          model: ANTHROPIC_CHAT_MODEL,
          messages: [
            {
              role: 'system',
              content: `Du er en professionel AI-assistent der skriver månedlige ressourcerapporter til brug i møder med personale, kommunen eller sagsbehandlere. Skriv en klar, professionel og empatisk rapport på dansk. Brug et sprog der er forståeligt for alle. Strukturer rapporten med: 1) Overordnet vurdering, 2) Ressourcedata, 3) Mønstre og tendenser, 4) Anbefalinger. Max 300 ord.`,
            },
            {
              role: 'user',
              content: `Generer en månedlig ressourcerapport baseret på disse data:
- Måned: ${reportData.month}
- Gennemsnitlig humørscore: ${reportData.avgMood}/10
- Gennemsnitlig søvnkvalitet: ${reportData.avgSleep}/5
- Gennemsnitlig energi: ${reportData.avgEnergy}/5
- Check-in dage: ${reportData.checkInDays} ud af ${reportData.totalDays} dage
- Dominerende humørtilstande: ${reportData.topMoods.join(', ')}
- Journalindlæg: ${reportData.journalEntries}
- Gennemførte udfordringer: ${reportData.challengesCompleted}
- KRAP-observationer: ${reportData.krapHighlights.join('; ')}

Skriv en professionel rapport til brug i personalemøde eller sagsbehandlermøde.`,
            },
          ],
          stream: false,
          parameters: { max_tokens: 600, temperature: 0.6 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && mountedRef.current) {
          setAiSummary(text.trim());
          setGenerated(true);
        }
      }
    } catch {
      /* silently fail */
    } finally {
      if (mountedRef.current) setIsGenerating(false);
    }
  };

  const downloadAsPDF = async () => {
    setIsDownloading(true);
    // Build printable HTML and trigger browser print-to-PDF
    const content = `
      <!DOCTYPE html>
      <html lang="da">
      <head>
        <meta charset="UTF-8">
        <title>Ressourcerapport — ${reportData.month}</title>
        <style>
          body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; color: #1a1a2e; line-height: 1.6; }
          h1 { color: #4C1D95; border-bottom: 2px solid #7C3AED; padding-bottom: 8px; }
          h2 { color: #5B21B6; margin-top: 24px; }
          .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0; }
          .stat-box { background: #F3F4F6; border-radius: 8px; padding: 12px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #4C1D95; }
          .stat-label { font-size: 12px; color: #6B7280; }
          .bar-container { background: #E5E7EB; border-radius: 4px; height: 8px; margin: 4px 0; }
          .bar-fill { background: #7C3AED; border-radius: 4px; height: 8px; }
          .highlight { background: #EDE9FE; border-left: 3px solid #7C3AED; padding: 8px 12px; margin: 8px 0; border-radius: 0 4px 4px 0; }
          .ai-summary { background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 8px; padding: 16px; margin: 16px 0; white-space: pre-wrap; }
          .footer { margin-top: 40px; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 12px; }
        </style>
      </head>
      <body>
        <h1>📊 Månedlig Ressourcerapport</h1>
        <p><strong>Periode:</strong> ${reportData.month} &nbsp;|&nbsp; <strong>Genereret:</strong> ${new Date().toLocaleDateString('da-DK')}</p>
        
        <h2>Nøgletal</h2>
        <div class="stat-grid">
          <div class="stat-box"><div class="stat-value">${reportData.avgMood}/10</div><div class="stat-label">Gns. humør</div></div>
          <div class="stat-box"><div class="stat-value">${reportData.checkInDays}/${reportData.totalDays}</div><div class="stat-label">Check-in dage</div></div>
          <div class="stat-box"><div class="stat-value">${reportData.challengesCompleted}</div><div class="stat-label">Udfordringer</div></div>
        </div>
        
        <h2>Ressourceprofil</h2>
        <p>Søvn: ${reportData.avgSleep}/5</p>
        <div class="bar-container"><div class="bar-fill" style="width:${(reportData.avgSleep / 5) * 100}%"></div></div>
        <p>Energi: ${reportData.avgEnergy}/5</p>
        <div class="bar-container"><div class="bar-fill" style="width:${(reportData.avgEnergy / 5) * 100}%"></div></div>
        
        <h2>Dominerende humørtilstande</h2>
        <p>${reportData.topMoods.map((m) => `<strong>${m}</strong>`).join(', ')}</p>
        
        <h2>KRAP-observationer</h2>
        ${reportData.krapHighlights.map((h) => `<div class="highlight">${h}</div>`).join('')}
        
        ${aiSummary ? `<h2>AI-genereret vurdering</h2><div class="ai-summary">${aiSummary}</div>` : ''}
        
        <div class="footer">
          Rapport genereret af BUDR2.0 · Claude AI · ${new Date().toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        URL.revokeObjectURL(url);
      };
    }
    setTimeout(() => {
      if (mountedRef.current) setIsDownloading(false);
    }, 1500);
  };

  const barWidth = (val: number, max: number) => `${Math.round((val / max) * 100)}%`;

  return (
    <div className="min-h-screen gradient-midnight pb-32">
      <div className="sticky top-0 z-20 bg-midnight-900/90 backdrop-blur-xl border-b border-midnight-700/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="font-display text-lg sm:text-xl font-bold text-midnight-50">
            📊 Månedlig rapport
          </h1>
          <p className="text-xs text-midnight-400 mt-0.5">
            {reportData.month} · AI-genereret til personalemøder
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {/* Key stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: `${reportData.avgMood}/10`, label: 'Gns. humør', color: '#A78BFA' },
            {
              value: `${reportData.checkInDays}/${reportData.totalDays}`,
              label: 'Check-in',
              color: '#34D399',
            },
            { value: `${reportData.challengesCompleted}`, label: 'Udfordringer', color: '#FB923C' },
          ].map(({ value, label, color }) => (
            <div
              key={label}
              className="bg-midnight-800/50 rounded-2xl border border-midnight-700/50 p-2.5 text-center"
            >
              <p className="text-lg font-bold" style={{ color }}>
                {value}
              </p>
              <p className="text-[10px] text-midnight-400 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Resource bars */}
        <div className="bg-midnight-800/50 rounded-2xl border border-midnight-700/50 p-4">
          <h3 className="font-display text-sm font-bold text-midnight-100 mb-3">Ressourceprofil</h3>
          {[
            { label: 'Søvn', value: reportData.avgSleep, max: 5, color: '#60A5FA' },
            { label: 'Energi', value: reportData.avgEnergy, max: 5, color: '#FB923C' },
            { label: 'Humør', value: reportData.avgMood, max: 10, color: '#A78BFA' },
          ].map(({ label, value, max, color }) => (
            <div key={label} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-midnight-300">{label}</span>
                <span className="text-xs font-bold" style={{ color }}>
                  {value}/{max}
                </span>
              </div>
              <div className="bg-midnight-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{ width: barWidth(value, max), background: color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Top moods */}
        <div className="bg-midnight-800/50 rounded-2xl border border-midnight-700/50 p-4">
          <h3 className="font-display text-sm font-bold text-midnight-100 mb-3">
            Dominerende humørtilstande
          </h3>
          <div className="flex flex-wrap gap-2">
            {reportData.topMoods.map((mood, i) => (
              <span
                key={mood}
                className={`text-xs font-semibold rounded-full px-3 py-1.5 border ${
                  i === 0
                    ? 'bg-aurora-violet/15 text-purple-300 border-aurora-violet/25'
                    : i === 1
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                      : 'bg-blue-500/15 text-blue-300 border-blue-500/25'
                }`}
              >
                {mood}
              </span>
            ))}
          </div>
        </div>

        {/* KRAP highlights */}
        <div className="bg-midnight-800/50 rounded-2xl border border-midnight-700/50 p-4">
          <h3 className="font-display text-sm font-bold text-midnight-100 mb-3">
            🔍 KRAP-observationer
          </h3>
          <div className="space-y-2">
            {reportData.krapHighlights.map((h, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-midnight-900/40 rounded-xl px-3 py-2"
              >
                <span className="text-aurora-violet text-sm mt-0.5">•</span>
                <p className="text-xs text-midnight-200">{h}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Generate AI summary */}
        {!generated ? (
          <button
            onClick={generateReport}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-aurora-violet/10 border border-aurora-violet/25 rounded-2xl px-4 py-4 text-sm text-purple-300 font-medium hover:bg-aurora-violet/15 transition-all duration-200 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span
                  className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
                <span className="ml-2">Claude genererer rapport...</span>
              </>
            ) : (
              <>
                <span>🤖</span>
                <span>Generer AI-opsummering til møde</span>
              </>
            )}
          </button>
        ) : (
          <div className="bg-aurora-violet/10 border border-aurora-violet/25 rounded-2xl p-4 animate-slide-up">
            <p className="text-xs text-purple-400 font-semibold mb-2">
              🤖 Claude&apos;s vurdering:
            </p>
            <p className="text-sm text-midnight-100 leading-relaxed whitespace-pre-wrap">
              {aiSummary}
            </p>
          </div>
        )}

        {/* Download button */}
        <button
          onClick={downloadAsPDF}
          disabled={isDownloading}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl px-4 py-4 text-sm text-emerald-300 font-medium hover:bg-emerald-500/15 transition-all duration-200 disabled:opacity-50"
        >
          {isDownloading ? (
            '⏳ Forbereder...'
          ) : (
            <>
              <span>📄</span>
              <span>Download som PDF (print-venlig)</span>
            </>
          )}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
