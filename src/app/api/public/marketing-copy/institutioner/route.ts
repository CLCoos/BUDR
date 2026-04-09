import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_INSTITUTIONER_HERO_COPY,
  sanitizeInstitutionerHeroCopy,
} from '@/lib/marketing/institutionerCopyCms';

const ROW_KEY = 'institutioner.hero_copy';

export async function GET(): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ copy: DEFAULT_INSTITUTIONER_HERO_COPY });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from('marketing_content_blocks')
    .select('published, draft')
    .eq('key', ROW_KEY)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ copy: DEFAULT_INSTITUTIONER_HERO_COPY });
  }

  const source = data?.published ?? data?.draft ?? DEFAULT_INSTITUTIONER_HERO_COPY;
  return NextResponse.json({ copy: sanitizeInstitutionerHeroCopy(source) });
}
