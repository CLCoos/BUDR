'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Check, ClipboardCopy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatNoteForFagsystem, type FagsystemNote } from '@/lib/fagsystem/format';
import { copyText, markTransferred, readHeaderPref } from '@/lib/fagsystem/client';

/**
 * Lille "Kopiér til fagsystem"-knap på et godkendt journalnotat. Kopierer teksten og markerer
 * notatet som overført, så det ikke dukker op på listen over manglende overførsler.
 */
export default function FagsystemCopyButton({
  note,
  transferred,
  onMarked,
}: {
  note: FagsystemNote;
  transferred?: boolean;
  onMarked?: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(false);
  const isDone = transferred || done;

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyText(formatNoteForFagsystem(note, readHeaderPref()));
    if (!ok) {
      toast.error('Kunne ikke kopiere');
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (isDone) return;
    const supabase = createClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (!supabase || !user) return;
    const { data: staff } = await supabase
      .from('care_staff')
      .select('org_id, full_name')
      .eq('id', user.id)
      .maybeSingle();
    if (!staff?.org_id) return;
    const res = await markTransferred(supabase, {
      orgId: staff.org_id as string,
      staffId: user.id,
      staffName: (staff.full_name as string) || '',
      notes: [note],
    });
    if (res.ok) {
      setDone(true);
      onMarked?.(note.id);
      toast.success('Kopieret og markeret som overført. Sæt teksten ind i fagsystemet.');
    } else {
      toast.success('Kopieret. Sæt teksten ind i fagsystemet.');
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => void onClick(e)}
      title={isDone ? 'Allerede overført. Kopiér igen' : 'Kopiér til fagsystem (fx Sensum, Nexus)'}
      className="inline-flex min-h-[32px] items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold"
      style={{
        borderColor: isDone ? 'transparent' : 'var(--cp-border)',
        color: isDone ? 'var(--cp-green)' : 'var(--cp-text)',
        backgroundColor: 'transparent',
      }}
    >
      {copied || isDone ? (
        <Check className="h-3 w-3" aria-hidden />
      ) : (
        <ClipboardCopy className="h-3 w-3" aria-hidden />
      )}
      {copied ? 'Kopieret' : isDone ? 'Overført' : 'Kopiér'}
    </button>
  );
}
