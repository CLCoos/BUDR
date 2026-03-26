'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Phone, Mail, Edit, AlertTriangle, Calendar } from 'lucide-react';

export default function ResidentHeader() {
  return (
    <div>
      <Link href="/care-portal-dashboard">
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Tilbage til dashboard
        </button>
      </Link>

      <div className="bg-white rounded-lg border border-gray-100 p-5">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            AM
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Anders M.</h1>
                <div className="text-sm text-gray-500 mt-0.5">Beboer · Værelse 104 · Bosted Nordlys</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-sm font-semibold">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Grøn
                </span>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-all">
                  <Edit size={14} /> Rediger
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">Indflyttet</div>
                <div className="text-sm font-medium text-gray-800">14/08/2024</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">Primær kontakt</div>
                <div className="text-sm font-medium text-gray-800">Sara K.</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">Sidst check-in</div>
                <div className="text-sm font-medium text-gray-800">I dag · 08:30</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">Stribe</div>
                <div className="text-sm font-medium text-gray-800">🔥 7 dage</div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1D9E75] transition-colors">
                <Phone size={14} /> +45 22 33 44 55
              </button>
              <span className="text-gray-300">·</span>
              <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1D9E75] transition-colors">
                <Mail size={14} /> anders.m@nordlys.dk
              </button>
              <span className="text-gray-300">·</span>
              <Link href="/handover-workspace">
                <button className="flex items-center gap-1.5 text-sm text-[#1D9E75] hover:underline">
                  <Calendar size={14} /> Skriv vagtnotat
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Alert banner if needed */}
        <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700">
            <span className="font-semibold">Planlagt lægebesøg</span> · 28/03/2026 kl. 10:00 · Husk medicin-liste
          </div>
        </div>
      </div>
    </div>
  );
}