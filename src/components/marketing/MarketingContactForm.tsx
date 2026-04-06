'use client';

import { useCallback, useState } from 'react';

const FALLBACK_MAIL = 'mailto:hej@budrcare.dk?subject=Kontakt%20BUDR%20Care';

export type MarketingContactFormProps = {
  /** Fx institutioner | forsiden — gemmes i databasen til filtrering */
  source: string;
  /** Vises i bekræftelsestekst */
  responseWeekdays?: number;
};

export default function MarketingContactForm({
  source,
  responseWeekdays = 2,
}: MarketingContactFormProps) {
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [hp, setHp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [errText, setErrText] = useState('');

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setSubmitting(true);
      setStatus('idle');
      setErrText('');
      try {
        const res = await fetch('/api/marketing/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            institution,
            role,
            message,
            source,
            website: hp,
            referrer: typeof document !== 'undefined' ? document.referrer : '',
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.ok) {
          setStatus('ok');
          setName('');
          setInstitution('');
          setRole('');
          setMessage('');
        } else {
          setStatus('err');
          setErrText(
            data.error ??
              (res.status === 429 ? 'For mange forsøg. Vent lidt og prøv igen.' : 'Noget gik galt.')
          );
        }
      } catch {
        setStatus('err');
        setErrText('Forbindelsesfejl. Prøv igen, eller skriv direkte til hej@budrcare.dk');
      } finally {
        setSubmitting(false);
      }
    },
    [hp, institution, message, name, role, source, submitting]
  );

  if (status === 'ok') {
    return (
      <div className="marketing-contact-form" role="status" aria-live="polite">
        <div className="marketing-contact-form-status marketing-contact-form-status--ok">
          <strong>Tak for jeres henvendelse.</strong>
          <br />
          Vi har modtaget den og vender typisk tilbage inden for{' '}
          <strong>{responseWeekdays} hverdage</strong>.
        </div>
        <p className="marketing-contact-form-note">
          <button
            type="button"
            className="marketing-contact-form-submit"
            style={{ marginTop: 16 }}
            onClick={() => setStatus('idle')}
          >
            Send en ny besked
          </button>
        </p>
      </div>
    );
  }

  return (
    <form className="marketing-contact-form" onSubmit={onSubmit} noValidate>
      <div className="marketing-contact-form-fields">
        <div className="marketing-contact-form-hp" aria-hidden>
          <label htmlFor="marketing-contact-hp">Website</label>
          <input
            id="marketing-contact-hp"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="marketing-contact-name">Navn</label>
          <input
            id="marketing-contact-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dit fulde navn"
          />
        </div>
        <div>
          <label htmlFor="marketing-contact-institution">Institution</label>
          <input
            id="marketing-contact-institution"
            name="institution"
            type="text"
            autoComplete="organization"
            required
            maxLength={240}
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="Botilbud, forvaltning, kommune …"
          />
        </div>
        <div>
          <label htmlFor="marketing-contact-role">Rolle</label>
          <input
            id="marketing-contact-role"
            name="role"
            type="text"
            autoComplete="organization-title"
            required
            maxLength={160}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Fx leder, koordinator, IT …"
          />
        </div>
        <div>
          <label htmlFor="marketing-contact-message">Besked</label>
          <textarea
            id="marketing-contact-message"
            name="message"
            required
            maxLength={8000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hvad vil I gerne vide eller aftale?"
          />
        </div>
      </div>
      {status === 'err' && errText ? (
        <div className="marketing-contact-form-status marketing-contact-form-status--err">
          {errText}
        </div>
      ) : null}
      <button type="submit" className="marketing-contact-form-submit" disabled={submitting}>
        {submitting ? 'Sender…' : 'Send henvendelse'}
      </button>
      <p className="marketing-contact-form-note">
        Vi svarer som udgangspunkt inden for {responseWeekdays} hverdage. Har I brug for hurtig
        kontakt, kan I også bruge e-mail nedenfor.
      </p>
      <p className="marketing-contact-form-fallback">
        Foretrækker I direkte mail? <a href={FALLBACK_MAIL}>hej@budrcare.dk</a>
      </p>
    </form>
  );
}
