'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { LysThemeTokens } from '../lib/lysTheme';
import type { StorageMode } from '@/types/local';
import type { LysRecoveryStory } from '@/types/lys';

interface Props {
  tokens: LysThemeTokens;
  accent?: string;
  firstName?: string;
  reducedMotion?: boolean;
  onBack?: () => void;
  onDone?: () => void;
  storageMode?: StorageMode;
}

function formatRelativeDanish(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const day = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (day === 0) return 'i dag';
  if (day === 1) return 'i går';
  if (day < 7) return `for ${day} dage siden`;
  const week = Math.floor(day / 7);
  if (week < 4) return `for ${week} uger siden`;
  return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

export default function LysMyStories({
  tokens,
  accent,
  firstName,
  reducedMotion: _reducedMotion,
  onBack,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<LysRecoveryStory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lys/my-stories', { credentials: 'same-origin' });
      if (!res.ok) {
        if (res.status !== 404) toast.error('Kunne ikke hente dine historier');
        setStories([]);
        return;
      }
      const data = (await res.json()) as { stories: LysRecoveryStory[] };
      setStories(data.stories ?? []);
    } catch {
      toast.error('Ingen forbindelse');
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStories();
  }, [fetchStories]);

  const handleApprove = useCallback(async (storyId: string) => {
    setApprovingId(storyId);
    try {
      const res = await fetch(`/api/lys/my-stories/${storyId}/approve`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        toast.error('Kunne ikke godkende — prøv igen');
        return;
      }
      toast.success('Tak — personalet kan nu læse din historie');
      setStories((prev) =>
        prev.map((s) => (s.id === storyId ? { ...s, resident_approved: true } : s))
      );
    } catch {
      toast.error('Ingen forbindelse');
    } finally {
      setApprovingId(null);
    }
  }, []);

  const accentColor = accent ?? tokens.accent;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: tokens.bg,
        color: tokens.text,
        padding: '20px 20px 40px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Tilbage"
          style={{
            background: tokens.cardBg,
            border: `1px solid ${tokens.cardBorder}`,
            borderRadius: 12,
            padding: 8,
            cursor: 'pointer',
            color: tokens.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Dine historier</h1>
          <p style={{ fontSize: 14, color: tokens.textMuted, margin: '4px 0 0' }}>
            Her kan du gennemse hvad du har delt med Lys
          </p>
        </div>
      </div>

      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: tokens.textMuted,
            fontSize: 14,
          }}
        >
          Henter dine historier…
        </div>
      )}

      {!loading && stories.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: tokens.cardBg,
            border: `1px solid ${tokens.cardBorder}`,
            borderRadius: 16,
          }}
        >
          <BookOpen size={32} color={tokens.textMuted} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, color: tokens.text, margin: '0 0 8px' }}>
            {firstName ? `${firstName}, du har ikke optaget` : 'Du har ikke optaget'} nogen
            historier endnu
          </p>
          <p style={{ fontSize: 13, color: tokens.textMuted, margin: 0, lineHeight: 1.5 }}>
            Brug &quot;Tal til Lys&quot;-knappen når du gerne vil dele noget om din dag.
          </p>
        </div>
      )}

      {!loading && stories.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {stories.map((story) => {
            const isExpanded = expandedId === story.id;
            const isApproved = story.resident_approved;
            const isApproving = approvingId === story.id;
            const body = story.cleaned_story?.trim() ?? '';
            const preview = body.length > 120 ? `${body.slice(0, 120)}…` : body;

            return (
              <div
                key={story.id}
                style={{
                  background: tokens.cardBg,
                  border: `1px solid ${tokens.cardBorder}`,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontSize: 13, color: tokens.textMuted }}>
                    {formatRelativeDanish(story.created_at)}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: isApproved ? `${accentColor}20` : tokens.bg,
                      color: isApproved ? accentColor : tokens.textMuted,
                      border: `1px solid ${isApproved ? accentColor : tokens.cardBorder}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {isApproved ? (
                      <>
                        <ShieldCheck size={12} /> Delt med personalet
                      </>
                    ) : (
                      'Kun for dig'
                    )}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 15,
                    lineHeight: 1.5,
                    color: tokens.text,
                    marginBottom: 12,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {body ? (isExpanded ? body : preview) : 'Din fortælling er ved at blive klar…'}
                </div>

                {body.length > 120 && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : story.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: tokens.textMuted,
                      fontSize: 13,
                      cursor: 'pointer',
                      padding: '4px 0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 12,
                    }}
                  >
                    {isExpanded ? (
                      <>
                        Vis mindre <ChevronUp size={14} />
                      </>
                    ) : (
                      <>
                        Vis hele historien <ChevronDown size={14} />
                      </>
                    )}
                  </button>
                )}

                {!isApproved && body.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleApprove(story.id)}
                    disabled={isApproving}
                    style={{
                      width: '100%',
                      background: accentColor,
                      color: tokens.colorScheme === 'dark' ? tokens.text : '#fff',
                      border: 'none',
                      borderRadius: 12,
                      padding: '12px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: isApproving ? 'wait' : 'pointer',
                      opacity: isApproving ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {isApproving ? (
                      'Godkender…'
                    ) : (
                      <>
                        <Check size={16} /> Godkend at personalet må læse
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
