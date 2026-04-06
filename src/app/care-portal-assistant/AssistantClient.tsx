'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Send, Trash2, BrainCircuit, ExternalLink, ChevronDown } from 'lucide-react';
import {
  DEFAULT_DOCUMENT_SHORTCUT_KEYS,
  resolveStaffAssistantFollowUpHref,
  staffAssistantFollowUpHref,
  staffAssistantFollowUpLabel,
  type StaffAssistantFollowUp,
  type StaffAssistantFollowUpKey,
} from '@/lib/portalStaffAssistantFollowUps';

type Role = 'user' | 'assistant';
interface Message {
  role: Role;
  content: string;
  /** Strukturerede genveje fra AI eller presets (BUDR-portalen). */
  followUps?: StaffAssistantFollowUp[];
}

const SUGGESTIONS = [
  'Hvem er beboerne her, og hvad er vigtigt at vide?',
  'Hvad gør jeg hvis en beboer nægter at tage sin medicin?',
  'Hvordan håndterer jeg en konflikt mellem to beboere?',
  'Hvad skal jeg skrive i journalen efter en hændelse?',
  'Hvornår må man anvende magt ifølge loven?',
  'En beboer vil ikke forlade sit værelse. Hvad gør jeg?',
];

type PresetPayload = { text: string; followUps: StaffAssistantFollowUp[] };

const PRESET_RESPONSES: Record<string, PresetPayload> = {
  'Hvem er beboerne her, og hvad er vigtigt at vide?': {
    text: `Bostedet har aktuelt fem beboere. Generelt er det vigtigt at kende den enkeltes dagsrytme og trivselsmarkører — nogle har brug for struktur og forudsigelighed, andre trives bedst med lidt løsere rammer.

Det er også afgørende at kende husets aftale- og pædagogiske dokumenter (handleplaner, retningslinjer), så du handler inden for de rammer jeres bosted har aftalt med kommunen og teamet.

Som vikar er de vigtigste ting: læs seneste journal inden vagten, notér dig eventuelle advarselssignaler fra de foregående dage, og spørg den afløste kollega om der er noget særligt at være opmærksom på. Brug BUDR-systemet til at se beboernes stemningsscore og trafiklys — det giver et hurtigt overblik.

Hvis du er i tvivl om en beboer, er det altid bedre at spørge end at gætte.`,
    followUps: [
      {
        key: 'indsatsdok',
        reason: 'Se husets handleplaner og pædagogiske dokumenter for dette bosted',
      },
      {
        key: 'dataimport',
        reason: 'Uploadede dokumenter og filer knyttet til organisationen',
      },
      { key: 'beboere', reason: 'Profiler, aftaler og dokumenter pr. beboer' },
      { key: 'journal', reason: 'Seneste godkendte journalnotater på dashboard' },
    ],
  },

  'Hvad gør jeg hvis en beboer nægter at tage sin medicin?': {
    text: `Første skridt er at spørge roligt og nysgerrigt: "Er der noget særligt ved medicinen i dag?" — ofte er der en grund, fx bivirkninger, glemsel eller dårlig dag. Undgå at presse eller argumentere, da det typisk forværrer situationen.

Notér afvisningen i journalen med klokkeslæt og hvad beboeren sagde. Informér den ansvarlige sygeplejerske eller din faglige leder, da medicinnægtelse skal håndteres fagligt og eventuelt dokumenteres som afvigelse. Du må aldrig give medicin uden samtykke — det er lovgivningsmæssigt klart.

Prøv evt. igen efter 30 minutter med en anden indgangsvinkel, eller tilbyd at tage medicinen på en anden måde, hvis det er muligt.`,
    followUps: [
      { key: 'journal', reason: 'Dokumentér afvisningen som journalnotat' },
      { key: 'beboere', reason: 'Tjek beboerens medicinområde og aftaler i profilen' },
      { key: 'indsatsdok', reason: 'Husets retningslinjer for medicinhåndtering' },
    ],
  },

  'Hvordan håndterer jeg en konflikt mellem to beboere?': {
    text: `Hold dig rolig og neutral — din ro smitter. Adskil de to beboere fysisk, gerne ved at bede den ene om at følge med dig et andet sted hen, uden at det føles som en straf. Undgå at tage parti.

Lyt til begge parter hver for sig, anerkend deres følelser ("Jeg kan godt se, du er rigtig ked af det"), og undgå at dømme. Når begge er faldet ned, kan du eventuelt facilitere en kort, rolig samtale — men kun hvis begge er klar til det.

Dokumentér hændelsen i journalen for begge beboere: hvad skete der, hvad var din reaktion, og hvad blev resultatet. Informér din leder ved næste møde, eller med det samme hvis situationen var alvorlig.`,
    followUps: [
      { key: 'journal', reason: 'Journal for begge beboere efter hændelsen' },
      { key: 'beboere', reason: 'Se relationer og tidligere hændelser i profilerne' },
      { key: 'handover', reason: 'Overdrag til næste vagt hvis noget skal følges op' },
    ],
  },

  'Hvad skal jeg skrive i journalen efter en hændelse?': {
    text: `En god journalnotits er faktuel, konkret og uden fortolkning. Skriv hvad du observerede — ikke hvad du tror beboeren "mente" eller "følte". Brug gerne SOAP-strukturen: Situation, Observation, Analyse, Plan.

Eksempel: "Kl. 14:30 opstod verbal konflikt mellem beboer X og Y i fællesrummet. Begge parter blev adskilt. X udtrykte at Y havde taget hans stol. Y var ophidset men roliggjordes efter 10 minutter i eget værelse. Ingen fysisk kontakt. Beboerne har siden haft rolig adfærd. Leder informeret."

Husk: journalen er et juridisk dokument. Skriv altid med dit navn, og aldrig noget du ikke ville sige direkte til beboeren.`,
    followUps: [
      { key: 'journal', reason: 'Åbn journal-fanen og opret notat' },
      { key: 'indsatsdok', reason: 'Se krav til dokumentation i jeres dokumentation' },
    ],
  },

  'Hvornår må man anvende magt ifølge loven?': {
    text: `Magtanvendelse over for voksne med betydelig og varigt nedsat psykisk funktionsevne reguleres af Servicelovens §§ 124–136. Udgangspunktet er klart: magt må kun bruges som absolut sidste udvej og aldrig som straf eller bekvemmelighed.

Lovlige magtformer inkluderer: fastholdelse ved overhængende fare for skade (§ 126), tilbageholdelse i kortere tid (§ 127) og alarm- og pejlesystemer med samtykke. Al magtanvendelse skal indberettes til kommunen inden for 5 hverdage på en specifik blanket.

Som udgangspunkt: kald på en kollega, forsøg verbal de-eskalering, skab ro i rummet — og brug kun fysisk indgriben hvis beboeren er i overhængende fare for at skade sig selv eller andre. Ring til din leder eller vagttelefonen inden du handler, hvis situationen tillader det.`,
    followUps: [
      { key: 'indsatsdok', reason: 'Jeres procedurer og skabeloner til magtanvendelse' },
      { key: 'journal', reason: 'Dokumentér hændelsen og beslutninger' },
      { key: 'tilsyn', reason: 'Tilsyns- og kvalitetskrav omkring dokumentation' },
    ],
  },

  'En beboer vil ikke forlade sit værelse. Hvad gør jeg?': {
    text: `Respektér i første omgang beboerens ønske — det er hans eller hendes ret at opholde sig på værelset. Bank på, præsenter dig roligt, og spørg om du må komme ind eller tale ved døren. Undgå at kræve eller ultimere.

Prøv at forstå årsagen: Er beboeren angst? Træt? Konflikter med andre? Dårlig dag? Spørg åbent og lyttende. Tilbyd evt. noget konkret — en kop te, en kort snak, et spil. Nogle beboere har brug for tid og reagerer bedst på gentagne, korte og ikke-krævende kontakter.

Dokumentér i journalen at beboeren har opholdt sig isoleret og hvad du forsøgte. Kontakt din leder hvis isolationen varer længe eller er kombineret med andre bekymringstegn som manglende mad/drikke eller selvskade.`,
    followUps: [
      { key: 'journal', reason: 'Notér isolationsadfærd og dine tiltag' },
      { key: 'beboere', reason: 'Se beboerens plan, mål og tidligere mønstre' },
      { key: 'indsatsdok', reason: 'Husets retningslinjer ved længerevarende isolation' },
    ],
  },
};

type AssistantClientProps = {
  /** Samme mørke flade som resten af Care Portal (undgår hvide paneler) */
  carePortalDark?: boolean;
  /** Demo bruger andre base-stier til genveje end live-portalen. */
  demoMode?: boolean;
};

function shortcutBlurb(key: StaffAssistantFollowUpKey): string {
  switch (key) {
    case 'indsatsdok':
      return '— Handleplaner og pædagogisk dokumentation';
    case 'dataimport':
      return '— Uploadede filer og dokumenter';
    case 'beboere':
      return '— Aftaler og dokumenter pr. beboer';
    case 'journal':
      return '— Godkendte journalnotater';
    default:
      return '';
  }
}

function AssistantMessageFollowUps({
  followUps,
  demoMode,
  pd,
}: {
  followUps: StaffAssistantFollowUp[];
  demoMode: boolean;
  pd: boolean;
}) {
  const used = new Set<StaffAssistantFollowUpKey>(followUps.map((f) => f.key));
  const extraDefaults = DEFAULT_DOCUMENT_SHORTCUT_KEYS.filter((k) => !used.has(k));

  const chipClass =
    'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-[#1D9E75]/50 hover:bg-[#1D9E75]/10';

  const chipStyle = pd
    ? {
        borderColor: 'var(--cp-border)',
        color: 'var(--cp-text)',
        backgroundColor: 'var(--cp-bg3)',
      }
    : { borderColor: '#e5e7eb', color: '#374151', backgroundColor: '#fff' };

  const showAiRow = followUps.length > 0;
  const detailsKeys = followUps.length === 0 ? DEFAULT_DOCUMENT_SHORTCUT_KEYS : extraDefaults;
  const detailsSummary =
    followUps.length === 0
      ? 'Hvor finder jeg dokumenter og aftaler på dette bosted?'
      : 'Flere steder: dokumenter og aftaler på bostedet';

  return (
    <div
      className="mt-3 space-y-2 border-t pt-3"
      style={{ borderColor: pd ? 'var(--cp-border)' : '#e5e7eb' }}
    >
      {showAiRow && (
        <>
          <p
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: pd ? 'var(--cp-muted)' : '#9ca3af' }}
          >
            Åbn i BUDR
          </p>
          <div className="flex flex-col gap-2">
            {followUps.map((f) => (
              <Link
                key={`${f.key}-${f.reason.slice(0, 24)}`}
                href={staffAssistantFollowUpHref(f, demoMode)}
                className={chipClass}
                style={chipStyle}
              >
                <ExternalLink size={12} className="shrink-0 text-[#1D9E75]" />
                <span className="min-w-0 flex-1 text-left leading-snug">
                  <span className="font-semibold">{staffAssistantFollowUpLabel(f.key)}</span>
                  <span className="mt-0.5 block font-normal opacity-90">{f.reason}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {detailsKeys.length > 0 && (
        <details
          className="group rounded-lg border"
          style={{ borderColor: pd ? 'var(--cp-border)' : '#e5e7eb' }}
        >
          <summary
            className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium outline-none marker:hidden [&::-webkit-details-marker]:hidden"
            style={{
              color: pd ? 'var(--cp-text)' : '#374151',
              backgroundColor: pd ? 'var(--cp-bg3)' : '#f9fafb',
            }}
          >
            <ChevronDown
              size={14}
              className="shrink-0 text-[#1D9E75] transition-transform group-open:rotate-180"
            />
            {detailsSummary}
          </summary>
          <div
            className="space-y-1.5 border-t px-3 py-2"
            style={{
              borderColor: pd ? 'var(--cp-border)' : '#e5e7eb',
              backgroundColor: pd ? 'var(--cp-bg2)' : '#fff',
            }}
          >
            {detailsKeys.map((key) => (
              <Link
                key={key}
                href={resolveStaffAssistantFollowUpHref(key, demoMode)}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md px-1 py-1 text-xs hover:underline"
                style={{ color: pd ? 'var(--cp-text)' : '#1f2937' }}
              >
                <span className="font-medium text-[#1D9E75]">
                  {staffAssistantFollowUpLabel(key)}
                </span>
                {shortcutBlurb(key) ? (
                  <span style={{ color: pd ? 'var(--cp-muted)' : '#6b7280' }}>
                    {shortcutBlurb(key)}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default function AssistantClient({
  carePortalDark = false,
  demoMode = false,
}: AssistantClientProps) {
  const pd = carePortalDark;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const userMsg: Message = { role: 'user', content: trimmed };
      const updated = [...messages, userMsg];
      setMessages(updated);
      setInput('');
      setStreaming(true);

      // Use preset answer immediately if available (demo / suggestion questions)
      const preset = PRESET_RESPONSES[trimmed];
      if (preset) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: preset.text, followUps: preset.followUps },
        ]);
        setStreaming(false);
        return;
      }

      // Placeholder for API response
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      try {
        const res = await fetch('/api/portal/staff-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updated }),
        });

        const data = await res.json().catch(() => ({ error: 'Ugyldigt svar' }));

        if (!res.ok) {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              role: 'assistant',
              content: `Beklager, noget gik galt: ${(data as { error?: string }).error ?? 'prøv igen'}`,
            },
          ]);
          return;
        }

        const reply = (data as { text?: string; followUps?: StaffAssistantFollowUp[] }).text ?? '';
        const followUps = (data as { followUps?: StaffAssistantFollowUp[] }).followUps ?? [];
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: reply, followUps },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: 'assistant',
            content: 'Forbindelsesfejl — tjek din internetforbindelse og prøv igen.',
          },
        ]);
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-3 border-b px-6 py-4"
        style={{
          borderColor: pd ? 'var(--cp-border)' : '#f3f4f6',
          backgroundColor: pd ? 'var(--cp-bg2)' : '#fff',
        }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1D9E75]/10">
          <BrainCircuit size={18} className="text-[#1D9E75]" />
        </div>
        <div>
          <div
            className="text-sm font-semibold"
            style={{ color: pd ? 'var(--cp-text)' : '#111827' }}
          >
            Faglig støtte
          </div>
          <div className="text-xs" style={{ color: pd ? 'var(--cp-muted)' : '#9ca3af' }}>
            Erfaren kollega · Fortrolig · Altid tilgængelig
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="ml-auto flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: pd ? 'var(--cp-muted)' : '#9ca3af' }}
          >
            <Trash2 size={13} />
            Ryd samtale
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4"
        style={{ backgroundColor: pd ? 'var(--cp-bg)' : undefined }}
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1D9E75]/10">
              <BrainCircuit size={28} className="text-[#1D9E75]" />
            </div>
            <h2
              className="mb-1 text-base font-semibold"
              style={{ color: pd ? 'var(--cp-text)' : '#1f2937' }}
            >
              Hvad kan jeg hjælpe med?
            </h2>
            <p
              className="mb-6 max-w-xs text-sm"
              style={{ color: pd ? 'var(--cp-muted)' : '#9ca3af' }}
            >
              Spørg om beboere, faglige situationer, lovgivning eller hvad du ellers har brug for at
              vide.
            </p>
            <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-lg border px-3 py-2.5 text-left text-xs leading-snug transition-colors"
                  style={
                    pd
                      ? {
                          color: 'var(--cp-text)',
                          backgroundColor: 'var(--cp-bg2)',
                          borderColor: 'var(--cp-border)',
                        }
                      : { color: '#4b5563', backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#1D9E75]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BrainCircuit size={13} className="text-[#1D9E75]" />
                </div>
              )}
              <div
                className={`max-w-[min(100%,28rem)] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm bg-[#1D9E75] text-white whitespace-pre-wrap'
                    : 'rounded-tl-sm border'
                }`}
                style={
                  msg.role === 'assistant' && pd
                    ? {
                        backgroundColor: 'var(--cp-bg2)',
                        borderColor: 'var(--cp-border)',
                        color: 'var(--cp-text)',
                      }
                    : msg.role === 'assistant' && !pd
                      ? {
                          backgroundColor: '#f9fafb',
                          borderColor: '#f3f4f6',
                          color: '#1f2937',
                        }
                      : undefined
                }
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.content === '' && streaming && (
                      <span className="inline-flex gap-0.5 items-center">
                        <span
                          className="w-1 h-1 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="w-1 h-1 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="w-1 h-1 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </span>
                    )}
                    {msg.content !== '' && (
                      <AssistantMessageFollowUps
                        followUps={msg.followUps ?? []}
                        demoMode={demoMode}
                        pd={pd}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="shrink-0 border-t px-4 py-3"
        style={{
          borderColor: pd ? 'var(--cp-border)' : '#f3f4f6',
          backgroundColor: pd ? 'var(--cp-bg2)' : '#fff',
        }}
      >
        <div
          className="flex items-end gap-2 rounded-xl border px-3 py-2 transition-colors focus-within:border-[#1D9E75]"
          style={
            pd
              ? {
                  backgroundColor: 'var(--cp-bg3)',
                  borderColor: 'var(--cp-border)',
                }
              : { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }
          }
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv dit spørgsmål..."
            disabled={streaming}
            className="max-h-32 min-h-[1.5rem] flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:opacity-70"
            style={{ color: pd ? 'var(--cp-text)' : '#1f2937' }}
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={!input.trim() || streaming}
            className="w-8 h-8 rounded-lg bg-[#1D9E75] flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#179060] transition-colors"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
        <p
          className="mt-1.5 text-center text-xs"
          style={{ color: pd ? 'var(--cp-muted)' : '#9ca3af' }}
        >
          Samtalen gemmes ikke · Til faglig vejledning — erstatter ikke akut hjælp
        </p>
      </div>
    </div>
  );
}
