/**
 * Borgernavne ud, før tekst sendes til AI; navnene sættes ind igen i svaret.
 * Hver borger får et nummer ("Borger 1"), så AI'en kan holde personerne adskilt uden at kende dem.
 */
import { replaceNames } from '@/lib/assistant/names';

export type AliasPerson = {
  /** Det navn, der skal stå i det færdige svar. */
  label: string;
  /** Alle navne og kaldenavne, der skal skjules (fornavn, efternavn, initialer osv.). */
  names: string[];
};

export type AliasMap = {
  alias: (index: number) => string;
  /** Skjul alle kendte navne i en tekst. */
  hide: (text: string) => string;
  /** Sæt de rigtige navne ind igen i AI'ens svar. */
  restore: (text: string) => string;
};

export function createAliasMap(people: AliasPerson[]): AliasMap {
  const alias = (i: number) => `Borger ${i + 1}`;
  return {
    alias,
    hide: (text) => {
      let out = text;
      people.forEach((p, i) => {
        out = replaceNames(out, [p.label, ...p.names], alias(i));
      });
      return out;
    },
    restore: (text) => {
      let out = text;
      // Højeste nummer først, så "Borger 12" ikke bliver til "<navn 1>2".
      for (let i = people.length - 1; i >= 0; i--) {
        out = out.replace(new RegExp(`\\bBorger ${i + 1}(?!\\d)`, 'g'), people[i]!.label);
      }
      return out;
    },
  };
}

/** Initialer af et navn: forbogstavet i hvert ord ("Asta Lindberg Fog" → "ALF"). Initialer bevares. */
export function initialerAfNavn(navn: string): string {
  const t = navn.trim();
  if (/^[\p{Lu}]{2,4}$/u.test(t)) return t;
  return t
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .join('')
    .slice(0, 4);
}

/** Navnedele, der skal skjules: hele navnet, hvert ord i det og initialer. */
export function namePartsFor(fullName: string, initials?: string | null): string[] {
  const parts = fullName.split(/\s+/).filter((p) => p.length >= 2);
  return [fullName, ...parts, ...(initials && initials.length >= 2 ? [initials] : [])];
}

export function clipText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const t = value.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
