'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Entry = {
  id: string;
  title: string;
  category: string;
  starts_at: string;
  ends_at: string;
};

export default function CareTeamPlannerStrip() {
  const [items, setItems] = useState<Entry[]>([]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 8);

      const { data } = await supabase
        .from('care_planner_entries')
        .select('id, title, category, starts_at, ends_at')
        .eq('visible_to_resident', true)
        .or(`resident_user_id.eq.${user.id},resident_user_id.is.null`)
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at', { ascending: true });

      setItems((data as Entry[]) ?? []);
    })();
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-sunrise-400/25 bg-sunrise-400/10 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-sunrise-300/90 mb-2">
        Fra dit team
      </p>
      <ul className="space-y-2">
        {items.map((e) => (
          <li
            key={e.id}
            className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-midnight-100"
          >
            <span className="font-medium">{e.title}</span>
            <span className="text-xs text-midnight-400">
              {new Date(e.starts_at).toLocaleString('da-DK', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {e.category}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
