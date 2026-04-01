'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, GripVertical, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Contact = {
  id: string;
  facility_id: string;
  label: string;
  phone: string;
  available_hours: string | null;
  sort_order: number;
};

type FormState = {
  label: string;
  phone: string;
  available_hours: string;
  sort_order: number;
};

const EMPTY_FORM: FormState = { label: '', phone: '', available_hours: '', sort_order: 0 };

async function getOrgId(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // For demo: use the test org — in production, look up staff member's org_id
  return 'aaaaaaaa-0000-0000-0000-000000000001';
}

export default function FacilityContactsManager() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [editing, setEditing] = useState<Contact | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = async (fid: string) => {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('facility_contacts')
      .select('id, facility_id, label, phone, available_hours, sort_order')
      .eq('facility_id', fid)
      .order('sort_order');
    setContacts((data ?? []) as Contact[]);
  };

  useEffect(() => {
    getOrgId().then(async id => {
      setOrgId(id);
      if (id) await load(id);
      setLoading(false);
    });
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sort_order: contacts.length });
    setShowModal(true);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({
      label: c.label,
      phone: c.phone,
      available_hours: c.available_hours ?? '',
      sort_order: c.sort_order,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.label.trim() || !form.phone.trim() || !orgId || saving) return;
    setSaving(true);
    const supabase = createClient();
    if (!supabase) { setSaving(false); return; }

    const payload = {
      facility_id: orgId,
      label: form.label.trim(),
      phone: form.phone.trim(),
      available_hours: form.available_hours.trim() || null,
      sort_order: form.sort_order,
    };

    if (editing) {
      await supabase.from('facility_contacts').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('facility_contacts').insert(payload);
    }

    setSaving(false);
    setShowModal(false);
    await load(orgId);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    if (!supabase || !orgId) return;
    await supabase.from('facility_contacts').delete().eq('id', id);
    setDeleteConfirm(null);
    await load(orgId);
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-400 text-sm">Indlæser…</div>;
  }

  return (
    <div className="space-y-6">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Phone className="h-4 w-4 text-[#0F1B2D]" />
            Krisekontakter
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Vises til borgerne i krisestøtte-sektionen under &quot;Bostedet&quot;
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-full bg-[#0F1B2D] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-80"
        >
          <Plus className="h-3.5 w-3.5" />
          Tilføj kontakt
        </button>
      </div>

      {/* Contact list */}
      {contacts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-14 text-center">
          <p className="text-2xl mb-2">📞</p>
          <p className="text-gray-500 font-semibold">Ingen krisekontakter endnu</p>
          <p className="text-gray-400 text-sm mt-1">Tilføj kontakter som borgerne kan ringe til i en krise</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map(c => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm"
            >
              <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: '#0F1B2D14' }}
              >
                <Phone className="h-4 w-4 text-[#0F1B2D]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{c.label}</p>
                <p className="text-sm text-gray-600">{c.phone}</p>
                {c.available_hours && (
                  <p className="text-xs text-gray-400 mt-0.5">{c.available_hours}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Rediger"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(c.id)}
                  className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Slet"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                {editing ? 'Rediger kontakt' : 'Tilføj krisekontakt'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                Betegnelse
              </label>
              <input
                type="text"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="F.eks. Vagttelefon, Nattevagt…"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0F1B2D]"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                Telefonnummer
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="F.eks. 98 12 34 56"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0F1B2D]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                Tilgængelighed <span className="normal-case font-normal text-gray-500">(valgfri)</span>
              </label>
              <input
                type="text"
                value={form.available_hours}
                onChange={e => setForm(f => ({ ...f, available_hours: e.target.value }))}
                placeholder="F.eks. Alle tider, Hverdage 8–16, 22–07…"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0F1B2D]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                Rækkefølge
              </label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-32 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0F1B2D]"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!form.label.trim() || !form.phone.trim() || saving}
                className="flex-1 rounded-xl bg-[#0F1B2D] py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                {saving ? 'Gemmer…' : editing ? 'Gem ændringer' : 'Tilføj kontakt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center space-y-4">
            <p className="text-base font-bold text-gray-900">Slet kontakt?</p>
            <p className="text-sm text-gray-500">Handlingen kan ikke fortrydes.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(deleteConfirm)}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white"
              >
                Slet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
