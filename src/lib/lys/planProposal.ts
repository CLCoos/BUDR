/**
 * Lys foreslår en ændret dagsplan ud fra borgerens ønske. Personalet godkender forslaget.
 * Medicinpunkter kan aldrig ændres af AI'en: de låses i koden, uanset hvad modellen svarer.
 */
import { medLysPersona } from './persona';

export type PlanItem = {
  id: string;
  time: string;
  title: string;
  description?: string;
  category: 'mad' | 'medicin' | 'aktivitet' | 'hvile' | 'social';
};

export const PLAN_PROPOSAL_SYSTEM =
  medLysPersona(`Borgeren beder om en ændring i sin dagsplan. Foreslå en ændret plan ud fra borgerens ønske.
- Gør kun det, borgeren beder om. Resten af planen bliver, som den er.
- Medicinpunkter (category "medicin") må du aldrig flytte, ændre eller fjerne. Beder borgeren om det, så lad dem stå og skriv i ai_reasoning, at medicin skal aftales med personalet.
- Vær realistisk: lad der være tid til mad og hvile.
- ai_reasoning er til borgeren og personalet: 1-2 korte sætninger på almindeligt dansk om, hvad du har ændret.

Svar KUN med gyldig JSON uden markdown:
{ "proposed_items": [{"id": "...", "time": "HH:MM", "title": "...", "description": "...", "category": "mad|medicin|aktivitet|hvile|social"}], "ai_reasoning": "..." }`);

/** Medicinpunkterne fra den nuværende plan står uændret i forslaget, sorteret efter tid. */
export function laasMedicin(current: PlanItem[], proposed: PlanItem[]): PlanItem[] {
  const medicin = current.filter((i) => i.category === 'medicin');
  const ovrige = proposed.filter((i) => i && i.category !== 'medicin');
  return [...medicin, ...ovrige].sort((a, b) => String(a.time).localeCompare(String(b.time)));
}
