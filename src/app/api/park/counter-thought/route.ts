// BUDR – API Route: Tankefanger AI-forslag
// POST /api/park/counter-thought
// Bruges i Flow 2: Tankefanger — Lys foreslår en modtanke

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { situation, thought, emotion } = await req.json();

    if (!situation || !thought) {
      return NextResponse.json({ error: 'Mangler situation eller tanke' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `Du er Lys — en varm, støttende AI-ledsager i BUDR-appen for borgere på socialpsykiatriske bosteder.

Din opgave: Hjælp borgeren med at finde en mere hjælpsom tanke (modtanke) til den automatiske tanke de har haft.

Regler:
- Skriv på dansk, enkelt og varmt
- Max 2-3 korte sætninger
- Vær anerkendende, ikke afvisende
- Start IKKE med "Jeg" eller "Du"
- Foreslå en konkret, realistisk alternativ tanke
- Returner KUN modtanken — ingen forklaringer, ingen indledning`,

      messages: [
        {
          role: 'user',
          content: `Situation: ${situation}
Automatisk tanke: ${thought}
${emotion ? `Følelse: ${emotion}` : ''}

Foreslå en hjælpsom modtanke.`,
        },
      ],
    });

    const suggestion = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Counter-thought API error:', error);
    return NextResponse.json({ error: 'Kunne ikke hente forslag' }, { status: 500 });
  }
}
