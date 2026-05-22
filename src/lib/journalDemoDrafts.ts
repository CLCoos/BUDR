/**
 * Simulerede AI-journaludkast til Care Portal-demo (ingen API).
 * Tilknyttet beboer-id fra CARE_DEMO_RESIDENT_PROFILES.
 */
export type JournalDemoDraft = {
  /** Kort kontekstlinje som om den kom fra Lys + dag */
  lysSummary: string;
  handling: string;
  reflection: string;
};

export const JOURNAL_DEMO_DRAFTS: Record<string, JournalDemoDraft> = {
  'res-sara': {
    lysSummary:
      'Lys i nat: samtale 02:10 · humør tungt · tema: uro og søvnbesvær — men borgeren opsøgte selv hjælp.',
    handling:
      'Sara var vågen og urolig i nat. Hun talte med Lys ved 02-tiden og gav udtryk for begyndende uro, der minder om tidligere optakt. Vigtigt: hun genkendte selv tegnene og bad om kontakt. Nattevagt fulgte tryghedsplanen, og Sara faldt til ro ca. 03:00. Ingen yderligere tiltag nødvendige.',
    reflection:
      'Markant forskel fra episoden for seks uger siden: Sara griber nu ind tidligt og bruger sin tryghedsplan. Det understøtter recoverymålet om at genkende egne tidlige tegn. Følg op med daglig kontakt og hold øje med søvn de næste dage.',
  },
  'res-mikkel': {
    lysSummary:
      'Lys i dag: check-in 08:15 · humør OK · energi middel · tema: lidt anspændt før fælles frokost.',
    handling:
      'Mikkel spiste morgenmad på værelset og deltog senere i frokost i fællesrum i ca. 20 minutter. Kort samtale med personale — ingen uro observeret. Medicin taget som planlagt.',
    reflection:
      'Gult trafiklys passer til svingende men stabil form. Hold øje med søvn og social belastning. Ingen PN siden i går — notér ved næste vagtskifte.',
  },
  'res-anders': {
    lysSummary:
      'Lys i dag: check-in 08:20 · humør roligt · energi stabil · tema: læser i fællesrum.',
    handling:
      'Anders deltog i morgenmad og sad roligt med avis i dagligstuen. Ingen bekymringer ved morgenrunden. Planlagt gåtur i gården gennemføres efter eget ønske.',
    reflection:
      'Rolig fase med bipolar lidelse — bevar rutiner og undgå sent stimuli. Lægevideo om to uger: forbered korte spørgsmål sammen med Anders.',
  },
  'res-mette': {
    lysSummary:
      'Lys i dag: check-in 07:55 · humør godt · energi god · tema: yoga og lyst til fællesskab.',
    handling:
      'Mette deltog i morgenyoga og hjalp frivilligt med at dække bord til morgenmad. Positiv stemning i fællesrum. Ingen særlige hændelser.',
    reflection:
      'Grønt trafiklys og velfungerende holdepunkt. Understøt hendes egne mål om fællesspisning og daglige gåture — peer-støtte kan bruges bevidst i gruppen.',
  },
  'res-camilla': {
    lysSummary:
      'Lys i går: check-in 21:10 · humør svingende · energi lav · tema: ønsker rolig opfølgning i morgen.',
    handling:
      'Camilla havde kort uro efter misforståelse i går eftermiddag — rolig samtale hjalp. I morges god kontakt med personalet; planlagt samtale med kontaktperson kl. 11. Ingen eskalering.',
    reflection:
      'Gult trafiklys — forudsigelighed og validering virker. Hold rolig tone ved konflikter. Dagens samtale bør bekræfte grænser og behov hun selv nævnte i går.',
  },
  'res-jonas': {
    lysSummary:
      'Lys i dag: check-in 08:10 · humør OK · energi usikker · tema: husregler og måltider som nyindflyttet.',
    handling:
      'Jonas spurgte til PARK og fælles aktiviteter ved kort gåtur med personale. Gennemgang af praktisk info gentaget ved frokost — virker lettet over tydelige rammer. Ingen uro.',
    reflection:
      'Nyindflyttet for tre uger — gradvis sociale tilbud og korte kontakter. Ugentlig evaluering af tilpasning som i indflytningsplanen.',
  },
};

export function getJournalDemoDraft(residentId: string): JournalDemoDraft | null {
  return JOURNAL_DEMO_DRAFTS[residentId] ?? null;
}
