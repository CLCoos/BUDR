import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import InviteForm from './InviteForm';

type Props = { params: Promise<{ code: string }> };

export default async function InvitePage({ params }: Props) {
  const { code } = await params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) notFound();

  const admin = createClient(url, serviceKey);

  const { data: org } = await admin
    .from('organisations')
    .select('id, name')
    .eq('invite_code', code)
    .single();

  if (!org) notFound();

  return (
    <div className="min-h-screen bg-[var(--cp-bg)]">
      <div className="mx-auto grid min-h-screen grid-cols-1 md:grid-cols-5">
        <aside className="hidden overflow-hidden bg-[var(--cp-bg)] text-white md:col-span-3 md:flex md:flex-col">
          <div className="px-10 pt-10">
            <span
              style={{
                fontFamily: 'var(--font-budr-wordmark, "DM Serif Display", serif)',
                fontSize: 22,
                color: 'white',
                letterSpacing: '-0.5px',
              }}
            >
              BUDR Care
            </span>
          </div>
          <div className="flex flex-1 items-center justify-center px-8 text-center">
            <div className="max-w-[380px]">
              <p
                style={{
                  fontFamily: 'var(--font-budr-wordmark, "DM Serif Display", serif)',
                  fontSize: 'clamp(20px, 2.2vw, 28px)',
                  lineHeight: 1.5,
                  color: 'white',
                  opacity: 0.9,
                }}
              >
                Du er inviteret til {org.name}.
              </p>
              <div
                className="mx-auto mt-5 h-px w-10"
                style={{ backgroundColor: 'rgb(255 255 255 / 0.3)' }}
              />
              <p className="mt-5 text-sm font-light text-white/50">
                Opret din konto nedenfor og log ind fra dag ét.
              </p>
            </div>
          </div>
          <div className="absolute bottom-8 left-10 text-xs font-light text-white/40">
            budrcare.dk
          </div>
        </aside>

        <section className="flex min-h-screen items-center justify-center bg-white px-6 py-10 md:col-span-2 md:px-10">
          <div className="w-full max-w-[340px]">
            <div className="mb-7">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--cp-muted)]">
                Invitation
              </p>
              <h1
                className="mt-1"
                style={{
                  fontFamily: 'var(--font-budr-wordmark, "DM Serif Display", serif)',
                  fontSize: 26,
                  color: 'var(--cp-bg)',
                }}
              >
                {org.name}
              </h1>
              <p className="mt-1 text-[13px] font-light text-[var(--cp-muted)]">
                Opret din konto for at komme i gang
              </p>
            </div>

            <InviteForm orgId={org.id} inviteCode={code} />
          </div>
        </section>
      </div>
    </div>
  );
}
