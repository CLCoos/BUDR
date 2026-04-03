'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Lys from '@/components/Lys';
import DirectMessage from '@/components/DirectMessage';
import SharedGoalUpdate from '@/components/SharedGoalUpdate';
import CelebrationNotifications from '@/components/CelebrationNotifications';
import { createClient } from '@/lib/supabase/client';

interface SupportContact {
  id: string;
  name: string;
  emoji: string;
  role: string;
  color: string;
  bgColor: string;
}

interface StøttecirklenProps {
  contacts?: SupportContact[];
}

const defaultContacts: SupportContact[] = [
  {
    id: 'c1',
    name: 'Mor',
    emoji: '👩',
    role: 'Familie',
    color: '#FB923C',
    bgColor: 'rgba(251,146,60,0.15)',
  },
  {
    id: 'c2',
    name: 'Bedste ven',
    emoji: '🧑',
    role: 'Ven',
    color: '#A78BFA',
    bgColor: 'rgba(167,139,250,0.15)',
  },
  {
    id: 'c3',
    name: 'Terapeut',
    emoji: '🩺',
    role: 'Professionel',
    color: '#34D399',
    bgColor: 'rgba(52,211,153,0.15)',
  },
  {
    id: 'c4',
    name: 'Søster',
    emoji: '👧',
    role: 'Familie',
    color: '#F472B6',
    bgColor: 'rgba(244,114,182,0.15)',
  },
];

const orbitAngles = [0, 90, 180, 270];

type ActiveTab = 'besked' | 'mål' | 'fejring';

export default function Støttecirklen({ contacts = defaultContacts }: StøttecirklenProps) {
  const router = useRouter();
  const [selectedContact, setSelectedContact] = useState<SupportContact | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('besked');
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, [supabase]);

  const handleContactTap = (contact: SupportContact) => {
    if (selectedContact?.id === contact.id) {
      setSelectedContact(null);
    } else {
      setSelectedContact(contact);
      setActiveTab('besked');
    }
  };

  const tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: 'besked', label: 'Besked', icon: '💬' },
    { key: 'mål', label: 'Mål', icon: '🎯' },
    { key: 'fejring', label: 'Fejring', icon: '🎉' },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="font-display text-base font-bold text-midnight-50">Støttecirklen</h3>
        <p className="text-xs text-midnight-400 mt-1">
          Dine vigtigste mennesker — skriv fra Social med forvalgt kontakt
        </p>
      </div>

      {/* Orbit visualization */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 220, height: 220 }}
      >
        {/* Orbit ring */}
        <div
          className="absolute rounded-full border border-midnight-600/40"
          style={{ width: 180, height: 180 }}
        />
        <div
          className="absolute rounded-full border border-midnight-700/20"
          style={{ width: 220, height: 220 }}
        />

        {/* Center Lys */}
        <div className="relative z-10">
          <Lys mood="calm" size="sm" />
        </div>

        {/* Orbiting moons */}
        {contacts.slice(0, 4).map((contact, i) => {
          const angle = orbitAngles[i] * (Math.PI / 180);
          const radius = 90;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const isSelected = selectedContact?.id === contact.id;

          return (
            <button
              key={contact.id}
              onClick={() => handleContactTap(contact)}
              className="absolute flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95 focus:outline-none"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                animation: isAnimating ? `orbit ${8 + i * 2}s linear infinite` : 'none',
              }}
              aria-label={contact.name}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 shadow-lg transition-all duration-200"
                style={{
                  background: contact.bgColor,
                  borderColor: isSelected ? contact.color : `${contact.color}80`,
                  boxShadow: isSelected
                    ? `0 0 20px ${contact.color}80`
                    : `0 0 12px ${contact.color}40`,
                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {contact.emoji}
              </div>
            </button>
          );
        })}
      </div>

      {/* Toggle animation */}
      <button
        onClick={() => setIsAnimating(!isAnimating)}
        className="mt-4 text-xs text-midnight-500 hover:text-midnight-300 transition-colors"
      >
        {isAnimating ? '⏸ Pause' : '▶ Animér'}
      </button>

      {/* Selected contact panel */}
      {selectedContact && (
        <div
          className="mt-5 w-full max-w-xs rounded-2xl border overflow-hidden animate-slide-up"
          style={{
            background: 'rgba(15,15,26,0.97)',
            borderColor: `${selectedContact.color}30`,
          }}
        >
          {/* Contact header */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b"
            style={{
              background: selectedContact.bgColor,
              borderColor: `${selectedContact.color}20`,
            }}
          >
            <span className="text-2xl">{selectedContact.emoji}</span>
            <div className="flex-1">
              <p className="font-semibold text-sm text-midnight-50">{selectedContact.name}</p>
              <p className="text-xs text-midnight-400">{selectedContact.role}</p>
            </div>
            <button
              onClick={() => setSelectedContact(null)}
              className="text-midnight-400 hover:text-midnight-200 text-lg leading-none transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Luk"
            >
              ×
            </button>
          </div>

          <div className="px-4 py-3 border-b border-midnight-700/40">
            <button
              type="button"
              onClick={() => router.push(`/social?tab=kontakter&til=${selectedContact.id}`)}
              className="w-full py-3 rounded-xl text-sm font-semibold text-midnight-950 transition-all active:scale-[0.99] min-h-[48px]"
              style={{
                background: selectedContact.color,
                boxShadow: `0 8px 24px ${selectedContact.color}40`,
              }}
            >
              Skriv besked i Social →
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: `${selectedContact.color}15` }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 py-2.5 text-xs font-medium transition-all duration-200"
                style={{
                  color: activeTab === tab.key ? selectedContact.color : '#64748b',
                  borderBottom:
                    activeTab === tab.key
                      ? `2px solid ${selectedContact.color}`
                      : '2px solid transparent',
                  background: activeTab === tab.key ? `${selectedContact.color}08` : 'transparent',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === 'besked' && userId && (
              <DirectMessage
                contactId={selectedContact.id}
                contactName={selectedContact.name}
                contactEmoji={selectedContact.emoji}
                contactColor={selectedContact.color}
                contactBgColor={selectedContact.bgColor}
                userId={userId}
                onClose={() => setSelectedContact(null)}
              />
            )}

            {activeTab === 'mål' && userId && (
              <SharedGoalUpdate
                contactId={selectedContact.id}
                contactName={selectedContact.name}
                contactColor={selectedContact.color}
                contactBgColor={selectedContact.bgColor}
                userId={userId}
              />
            )}

            {activeTab === 'fejring' && userId && (
              <CelebrationNotifications
                contactId={selectedContact.id}
                contactName={selectedContact.name}
                contactColor={selectedContact.color}
                contactBgColor={selectedContact.bgColor}
                userId={userId}
              />
            )}

            {!supabase && (
              <p className="text-xs text-midnight-500 text-center py-4">
                Støttecirklen er ikke tilgængelig lige nu. Prøv igen senere.
              </p>
            )}
            {supabase && !userId && (
              <p className="text-xs text-midnight-500 text-center py-4">
                Log ind for at bruge Støttecirklen 🔐
              </p>
            )}
          </div>
        </div>
      )}

      {/* Contact names legend */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {contacts.slice(0, 4).map((contact) => (
          <button
            key={`legend-${contact.id}`}
            onClick={() => handleContactTap(contact)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all duration-200 hover:scale-105"
            style={{
              background: contact.bgColor,
              borderColor:
                selectedContact?.id === contact.id ? contact.color : `${contact.color}40`,
              color: contact.color,
            }}
          >
            {contact.emoji} {contact.name}
          </button>
        ))}
      </div>
    </div>
  );
}
