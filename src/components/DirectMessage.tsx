'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  content: string;
  isFromUser: boolean;
  createdAt: string;
}

type SupportMessageRow = {
  id: string;
  content: string;
  is_from_user: boolean;
  created_at: string;
};

interface DirectMessageProps {
  contactId: string;
  contactName: string;
  contactEmoji: string;
  contactColor: string;
  contactBgColor: string;
  userId: string;
  onClose: () => void;
}

export default function DirectMessage({
  contactId,
  contactName,
  contactEmoji,
  contactColor,
  contactBgColor,
  userId,
  onClose,
}: DirectMessageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchMessages();

    const channel = supabase
      .channel(`messages_${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          const row = payload.new as SupportMessageRow;
          setMessages((prev) => [
            ...prev,
            {
              id: row.id,
              content: row.content,
              isFromUser: row.is_from_user,
              createdAt: row.created_at,
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId]); // eslint-disable-line react-hooks/exhaustive-deps -- supabase client

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('contact_id', contactId)
        .eq('sender_id', userId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(
          (data as SupportMessageRow[]).map((row) => ({
            id: row.id,
            content: row.content,
            isFromUser: row.is_from_user,
            createdAt: row.created_at,
          }))
        );
      }
    } catch (err) {
      console.warn('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !supabase) return;
    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        sender_id: userId,
        contact_id: contactId,
        content: input.trim(),
        is_from_user: true,
      });
      if (!error) {
        setInput('');
      }
    } catch (err) {
      console.warn('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="flex flex-col rounded-2xl border overflow-hidden"
      style={{
        background: 'rgba(15,15,26,0.95)',
        borderColor: `${contactColor}30`,
        height: 360,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: `${contactColor}20`, background: contactBgColor }}
      >
        <span className="text-xl">{contactEmoji}</span>
        <span className="font-semibold text-sm text-midnight-50 flex-1">{contactName}</span>
        <button
          onClick={onClose}
          className="text-midnight-400 hover:text-midnight-200 text-lg leading-none transition-colors"
          aria-label="Luk chat"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: contactColor }}
            />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-midnight-500 mt-8">
            Start en samtale med {contactName} 💬
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isFromUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[75%] rounded-2xl px-3 py-2 text-sm"
                style={
                  msg.isFromUser
                    ? { background: contactColor, color: '#0f0f1a' }
                    : { background: 'rgba(255,255,255,0.07)', color: '#e2e8f0' }
                }
              >
                <p>{msg.content}</p>
                <p
                  className="text-xs mt-1 opacity-60"
                  style={{ color: msg.isFromUser ? '#0f0f1a' : '#94a3b8' }}
                >
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-t"
        style={{ borderColor: `${contactColor}20` }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={`Skriv til ${contactName}…`}
          className="flex-1 bg-transparent text-sm text-midnight-100 placeholder-midnight-500 outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
          style={{ background: contactColor }}
          aria-label="Send"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
              stroke="#0f0f1a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
