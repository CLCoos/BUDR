'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2, BrainCircuit } from 'lucide-react';

type Role = 'user' | 'assistant';
interface Message { role: Role; content: string }

const SUGGESTIONS = [
  'Hvem er beboerne her, og hvad er vigtigt at vide?',
  'Hvad gør jeg hvis en beboer nægter at tage sin medicin?',
  'Hvordan håndterer jeg en konflikt mellem to beboere?',
  'Hvad skal jeg skrive i journalen efter en hændelse?',
  'Hvornår må man anvende magt ifølge loven?',
  'En beboer vil ikke forlade sit værelse. Hvad gør jeg?',
];

const PRESET_ANSWERS: Record<string, string> = {
  'Hvem er beboerne her, og hvad er vigtigt at vide?':
    `Bostedet har aktuelt fem beboere. Generelt er det vigtigt at kende den enkeltes dagsrytme og trivselsmarkører — nogle har brug for struktur og forudsigelighed, andre trives bedst med lidt løsere rammer.

Som vikar er de vigtigste ting: læs seneste journal inden vagten, notér dig eventuelle advarselssignaler fra de foregående dage, og spørg den afløste kollega om der er noget særligt at være opmærksom på. Brug BUDR-systemet til at se beboernes stemningsscore og trafiklys — det giver et hurtigt overblik.

Hvis du er i tvivl om en beboer, er det altid bedre at spørge end at gætte.`,

  'Hvad gør jeg hvis en beboer nægter at tage sin medicin?':
    `Første skridt er at spørge roligt og nysgerrigt: "Er der noget særligt ved medicinen i dag?" — ofte er der en grund, fx bivirkninger, glemsel eller dårlig dag. Undgå at presse eller argumentere, da det typisk forværrer situationen.

Notér afvisningen i journalen med klokkeslæt og hvad beboeren sagde. Informér den ansvarlige sygeplejerske eller din faglige leder, da medicinnægtelse skal håndteres fagligt og eventuelt dokumenteres som afvigelse. Du må aldrig give medicin uden samtykke — det er lovgivningsmæssigt klart.

Prøv evt. igen efter 30 minutter med en anden indgangsvinkel, eller tilbyd at tage medicinen på en anden måde, hvis det er muligt.`,

  'Hvordan håndterer jeg en konflikt mellem to beboere?':
    `Hold dig rolig og neutral — din ro smitter. Adskil de to beboere fysisk, gerne ved at bede den ene om at følge med dig et andet sted hen, uden at det føles som en straf. Undgå at tage parti.

Lyt til begge parter hver for sig, anerkend deres følelser ("Jeg kan godt se, du er rigtig ked af det"), og undgå at dømme. Når begge er faldet ned, kan du eventuelt facilitere en kort, rolig samtale — men kun hvis begge er klar til det.

Dokumentér hændelsen i journalen for begge beboere: hvad skete der, hvad var din reaktion, og hvad blev resultatet. Informér din leder ved næste møde, eller med det samme hvis situationen var alvorlig.`,

  'Hvad skal jeg skrive i journalen efter en hændelse?':
    `En god journalnotits er faktuel, konkret og uden fortolkning. Skriv hvad du observerede — ikke hvad du tror beboeren "mente" eller "følte". Brug gerne SOAP-strukturen: Situation, Observation, Analyse, Plan.

Eksempel: "Kl. 14:30 opstod verbal konflikt mellem beboer X og Y i fællesrummet. Begge parter blev adskilt. X udtrykte at Y havde taget hans stol. Y var ophidset men roliggjordes efter 10 minutter i eget værelse. Ingen fysisk kontakt. Beboerne har siden haft rolig adfærd. Leder informeret."

Husk: journalen er et juridisk dokument. Skriv altid med dit navn, og aldrig noget du ikke ville sige direkte til beboeren.`,

  'Hvornår må man anvende magt ifølge loven?':
    `Magtanvendelse over for voksne med betydelig og varigt nedsat psykisk funktionsevne reguleres af Servicelovens §§ 124–136. Udgangspunktet er klart: magt må kun bruges som absolut sidste udvej og aldrig som straf eller bekvemmelighed.

Lovlige magtformer inkluderer: fastholdelse ved overhængende fare for skade (§ 126), tilbageholdelse i kortere tid (§ 127) og alarm- og pejlesystemer med samtykke. Al magtanvendelse skal indberettes til kommunen inden for 5 hverdage på en specifik blanket.

Som udgangspunkt: kald på en kollega, forsøg verbal de-eskalering, skab ro i rummet — og brug kun fysisk indgriben hvis beboeren er i overhængende fare for at skade sig selv eller andre. Ring til din leder eller vagttelefonen inden du handler, hvis situationen tillader det.`,

  'En beboer vil ikke forlade sit værelse. Hvad gør jeg?':
    `Respektér i første omgang beboerens ønske — det er hans eller hendes ret at opholde sig på værelset. Bank på, præsenter dig roligt, og spørg om du må komme ind eller tale ved døren. Undgå at kræve eller ultimere.

Prøv at forstå årsagen: Er beboeren angst? Træt? Konflikter med andre? Dårlig dag? Spørg åbent og lyttende. Tilbyd evt. noget konkret — en kop te, en kort snak, et spil. Nogle beboere har brug for tid og reagerer bedst på gentagne, korte og ikke-krævende kontakter.

Dokumentér i journalen at beboeren har opholdt sig isoleret og hvad du forsøgte. Kontakt din leder hvis isolationen varer længe eller er kombineret med andre bekymringstegn som manglende mad/drikke eller selvskade.`,
};

export default function AssistantClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setStreaming(true);

    // Use preset answer immediately if available (demo / suggestion questions)
    const preset = PRESET_ANSWERS[trimmed];
    if (preset) {
      setMessages(prev => [...prev, { role: 'assistant', content: preset }]);
      setStreaming(false);
      return;
    }

    // Placeholder for API response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/portal/staff-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      });

      const data = await res.json().catch(() => ({ error: 'Ugyldigt svar' }));

      if (!res.ok) {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: `Beklager, noget gik galt: ${(data as { error?: string }).error ?? 'prøv igen'}` },
        ]);
        return;
      }

      const reply = (data as { text?: string }).text ?? '';
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: reply },
      ]);
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Forbindelsesfejl — tjek din internetforbindelse og prøv igen.' },
      ]);
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <div className="w-9 h-9 rounded-lg bg-[#1D9E75]/10 flex items-center justify-center">
          <BrainCircuit size={18} className="text-[#1D9E75]" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Faglig støtte</div>
          <div className="text-xs text-gray-400">Erfaren kollega · Fortrolig · Altid tilgængelig</div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Trash2 size={13} />
            Ryd samtale
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-[#1D9E75]/10 flex items-center justify-center mb-4">
              <BrainCircuit size={28} className="text-[#1D9E75]" />
            </div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">Hvad kan jeg hjælpe med?</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Spørg om beboere, faglige situationer, lovgivning eller hvad du ellers har brug for at vide.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="text-left text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2.5 transition-colors leading-snug"
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
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#1D9E75] text-white rounded-tr-sm'
                    : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm'
                }`}
              >
                {msg.content}
                {msg.role === 'assistant' && msg.content === '' && streaming && (
                  <span className="inline-flex gap-0.5 items-center">
                    <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
        <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-[#1D9E75] transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv dit spørgsmål..."
            disabled={streaming}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none max-h-32 leading-relaxed"
            style={{ minHeight: '1.5rem' }}
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
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          Samtalen gemmes ikke · Til faglig vejledning — erstatter ikke akut hjælp
        </p>
      </div>
    </div>
  );
}
