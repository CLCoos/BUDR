'use client';

import React from 'react';
import { Footprints, HeartHandshake, Phone } from 'lucide-react';
/*
 * Supabase (senere): INSERT INTO care_portal_notifications (...)
 * — diskret varsling til personalet, uden alarmistisk sprog i UI
 */

type Props = {
  firstName: string;
  contactName?: string;
  onClose: () => void;
};

export default function LysKrisekort({ firstName, contactName = 'Sara K.', onClose }: Props) {
  return (
    <div
      className="mx-auto max-w-lg rounded-2xl border-2 p-6 shadow-sm transition-colors"
      style={{
        backgroundColor: 'rgba(219, 234, 254, 0.95)',
        borderColor: '#93C5FD',
        color: '#0F1B2D',
      }}
      role="region"
      aria-labelledby="lys-krise-heading"
    >
      <h2 id="lys-krise-heading" className="text-2xl font-bold text-budr-navy">
        Lys er her
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-budr-navy">
        Det lyder som en hård dag, {firstName}. Du behøver ikke klare det alene.
      </p>

      <ul className="mt-8 space-y-3">
        <li>
          <button
            type="button"
            className="flex min-h-[52px] w-full items-center gap-4 rounded-2xl bg-white p-4 text-left text-lg font-semibold text-budr-navy shadow-sm transition-transform hover:scale-[1.01]"
          >
            <Phone className="h-8 w-8 shrink-0 text-budr-purple" aria-hidden />
            Ring til {contactName}
          </button>
        </li>
        <li>
          <button
            type="button"
            className="flex min-h-[52px] w-full items-center gap-4 rounded-2xl bg-white p-4 text-left text-lg font-semibold text-budr-navy shadow-sm transition-transform hover:scale-[1.01]"
          >
            <Footprints className="h-8 w-8 shrink-0 text-budr-teal" aria-hidden />
            Gå en kort tur
          </button>
        </li>
        <li>
          <button
            type="button"
            className="flex min-h-[52px] w-full items-center gap-4 rounded-2xl bg-white p-4 text-left text-lg font-semibold text-budr-navy shadow-sm transition-transform hover:scale-[1.01]"
          >
            <HeartHandshake className="h-8 w-8 shrink-0 text-budr-purple" aria-hidden />
            Fortæl en medarbejder
          </button>
        </li>
      </ul>

      <p className="mt-6 text-base opacity-80">
        En medarbejder vil se, at du har haft en svær dag — så de kan støtte dig, hvis du vil.
      </p>

      <button
        type="button"
        onClick={onClose}
        className="mt-8 min-h-[48px] w-full rounded-full bg-budr-purple py-4 text-lg font-semibold text-white transition-opacity hover:opacity-90"
        style={{ color: '#fff' }}
      >
        Tilbage til Lys
      </button>
    </div>
  );
}
