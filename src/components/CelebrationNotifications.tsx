'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';

interface Notification {
  id: string;
  message: string;
  emoji: string;
  isRead: boolean;
  createdAt: string;
}

interface CelebrationNotificationsProps {
  contactId: string;
  contactName: string;
  contactColor: string;
  contactBgColor: string;
  userId: string;
}

const CELEBRATION_TEMPLATES = [
  { emoji: '🎉', message: 'Jeg har nået mit mål i dag!' },
  { emoji: '🔥', message: 'Streak fortsætter — dag {n}!' },
  { emoji: '⚡', message: 'Ny personlig rekord i XP!' },
  { emoji: '🌟', message: 'Jeg gennemførte alle dagens udfordringer!' },
  { emoji: '💪', message: 'Jeg holdt fast i min intention i dag.' },
  { emoji: '🌈', message: 'Bedste humør i ugen!' },
];

export default function CelebrationNotifications({
  contactId,
  contactName,
  contactColor,
  contactBgColor,
  userId,
}: CelebrationNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [customMsg, setCustomMsg] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchNotifications();

    const channel = supabase
      .channel(`celebrations_${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'celebration_notifications',
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          const row = payload.new as any;
          setNotifications((prev) => [
            {
              id: row.id,
              message: row.message,
              emoji: row.emoji,
              isRead: row.is_read,
              createdAt: row.created_at,
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId]);

  const fetchNotifications = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('celebration_notifications')
        .select('*')
        .eq('contact_id', contactId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(
          data.map((row: any) => ({
            id: row.id,
            message: row.message,
            emoji: row.emoji,
            isRead: row.is_read,
            createdAt: row.created_at,
          }))
        );
      }
    } catch (err) {
      console.log('Error fetching celebrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendCelebration = async (message: string, emoji: string) => {
    if (sending || !supabase) return;
    setSending(true);
    try {
      const { error } = await supabase.from('celebration_notifications').insert({
        user_id: userId,
        contact_id: contactId,
        message,
        emoji,
        is_read: false,
      });
      if (!error && showCustom) {
        setCustomMsg('');
        setShowCustom(false);
      }
    } catch (err) {
      console.log('Error sending celebration:', err);
    } finally {
      setSending(false);
    }
  };

  const markAllRead = async () => {
    if (!supabase) return;
    try {
      await supabase
        .from('celebration_notifications')
        .update({ is_read: true })
        .eq('contact_id', contactId)
        .eq('user_id', userId)
        .eq('is_read', false);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.log('Error marking read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-midnight-300 uppercase tracking-wider">
            Fejringer
          </p>
          {unreadCount > 0 && (
            <span
              className="text-xs font-bold rounded-full px-1.5 py-0.5"
              style={{ background: contactColor, color: '#0f0f1a' }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-midnight-500 hover:text-midnight-300 transition-colors"
          >
            Marker alle som læst
          </button>
        )}
      </div>

      {/* Quick send templates */}
      <div className="flex flex-wrap gap-1.5">
        {CELEBRATION_TEMPLATES.map((t, i) => (
          <button
            key={i}
            onClick={() => sendCelebration(t.message, t.emoji)}
            disabled={sending}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-all active:scale-95 disabled:opacity-50 hover:scale-105"
            style={{ background: contactBgColor, borderColor: `${contactColor}30`, color: contactColor }}
          >
            {t.emoji}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="rounded-full px-2.5 py-1 text-xs font-medium border transition-all active:scale-95 hover:scale-105"
          style={{ background: contactBgColor, borderColor: `${contactColor}30`, color: contactColor }}
        >
          ✏️
        </button>
      </div>

      {showCustom && (
        <div
          className="rounded-xl p-3 border flex gap-2"
          style={{ background: contactBgColor, borderColor: `${contactColor}30` }}
        >
          <input
            type="text"
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && customMsg.trim() && sendCelebration(customMsg.trim(), '🎊')}
            placeholder="Skriv din fejring…"
            className="flex-1 bg-transparent text-sm text-midnight-100 placeholder-midnight-500 outline-none"
          />
          <button
            onClick={() => customMsg.trim() && sendCelebration(customMsg.trim(), '🎊')}
            disabled={!customMsg.trim() || sending}
            className="text-xs font-semibold rounded-lg px-2.5 py-1 transition-all active:scale-95 disabled:opacity-40"
            style={{ background: contactColor, color: '#0f0f1a' }}
          >
            Send
          </button>
        </div>
      )}

      {/* Notification feed */}
      {loading ? (
        <div className="flex justify-center py-3">
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: contactColor }} />
        </div>
      ) : notifications.length === 0 ? (
        <p className="text-xs text-midnight-500 text-center py-2">
          Del en sejr med {contactName} 🌟
        </p>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-2 rounded-xl px-3 py-2 border transition-all"
              style={{
                background: n.isRead ? 'rgba(255,255,255,0.03)' : contactBgColor,
                borderColor: n.isRead ? 'rgba(255,255,255,0.05)' : `${contactColor}30`,
              }}
            >
              <span className="text-base shrink-0">{n.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-midnight-200 leading-snug">{n.message}</p>
                <p className="text-xs text-midnight-500 mt-0.5">{formatDate(n.createdAt)}</p>
              </div>
              {!n.isRead && (
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                  style={{ background: contactColor }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
