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
  'res-001': {
    lysSummary:
      'Lys i dag: check-in 07:45 · humør roligt · energi god · intet særligt tema — deltog i fælles morgenmad.',
    handling:
      'Deltog i morgenmad i fællesrum sammen med to andre beboere. Var samtalevillig og spiste det meste. Efterfølgende gik borgeren frivilligt med til oprydning i køkkenet (15 min.). Ingen konflikter eller afvisning af kontakt.',
    reflection:
      'Stemningen harmonerer med grønt trafiklys i Lys. Borgeren virker stabil og med overskud til fællesskab. Fortsæt opmuntring til små, meningsfulde aktiviteter. Vedvarende god søvn bør holdes øje med i kommende check-ins.',
  },
  'res-002': {
    lysSummary:
      'Lys i dag: check-in 08:12 · humør tungt · energi meget lav · tema: stress og ønske om samtale med personalet.',
    handling:
      'Borgeren blev observeret siddende alene i dagligstuen efter morgenmad. Ved henvendelse gav borgeren udtryk for indre uro og søvnproblemer natten over. Kort samtale (ca. 10 min.) med pædagog — borgeren accepterede tilbud om rolig aktivitet senere og kort gåtur efter eget ønske.',
    reflection:
      'Signalet fra Lys understøtter behov for nær kontakt. Anbefaler opfølgning ift. kriseplan og evt. justering af dagsprogram. Notér i team: borgeren har eksplicit bedt om samtale — prioriter det, hvis kapacitet tillader det.',
  },
  'res-003': {
    lysSummary: 'Lys i dag: check-in 07:50 · humør trist · energi lav · tema: krop og uro i maven.',
    handling:
      'Borgeren klagede over maveubehag og lav energi ved morgenrunden. Tilbudt let morgenmad og væske. Kontakt til sundhedsfagligt personale aftalt ift. vedvarende symptomer. Deltog ikke i fælles aktivitet formiddag, ophold på værelse efter eget valg med dør på klem.',
    reflection:
      'Kobling mellem somatiske klager og stemning bør holdes i mente. Følg op på lægefaglig kontakt. I Lys fremgår tristhed — vær opmærksom på om fysisk ubehag forstærker psykisk belastning.',
  },
  'res-004': {
    lysSummary:
      'Lys i dag: check-in 09:05 · humør blandet · energi svingende · tema: lyst til at snakke, men også træthed.',
    handling:
      'Borgeren deltog i kreativ workshop (eftermiddag) i ca. 40 minutter og viste engagement i farvelægning. Midlertidigt træk undervejs — kort pause på gangen. Efter aktiviteten henvendte borgeren sig til personalet og udtrykte, at det “var rart at lave noget med hænderne”.',
    reflection:
      'Blandet humør i Lys stemmer overens med observeret energisving. Små succeser i aktivitet kan bruges som anker i næste samtale. Overvej at tilbyde kortere, hyppigere aktiviteter frem for lange forløb.',
  },
  'res-005': {
    lysSummary:
      'Ingen check-in i Lys i dag endnu (seneste i går 15:30). Dagens observation: delvist tilbagetrukket adfærd.',
    handling:
      'Borgeren mødte ikke til planlagt fælles frokost. Ved opsøgende kontakt på værelse var borgeren høflig men kort i svarene. Tilbudt mad og væske — accepterede vand. Ingen tegn på akut fare; borgeren ønskede at være uforstyrret resten af formiddagen.',
    reflection:
      'Manglende Lys-check-in gør det ekstra vigtigt med konkret opfølgning. Drøft på teammøde om proaktiv kontakt senere på dagen. Vurder om borgeren oplever overstimulation eller behov for ekstra struktur.',
  },
  'res-006': {
    lysSummary:
      'Lys i dag: check-in 08:30 · humør positivt · energi middel · tema: glæde ved haven og udendørs.',
    handling:
      'Borgeren deltog i planlagt ophold i haven (45 min.) sammen med gruppe. Hjalp med at vande og snakkede med en anden beboer. Ved tilbagekomst gav borgeren udtryk for tilfredshed og aftalte med pædagog at gentage aktiviteten torsdag.',
    reflection:
      'Lys-signalet og observation harmonerer. Haven fungerer som meningsfuld ressource — kan indgå i handleplan og ugeskema. Styrk det positive ved næste samtale.',
  },
  'res-007': {
    lysSummary: 'Lys i dag: check-in 08:00 · humør godt · energi god · tema: søvn har været bedre.',
    handling:
      'Borgeren fortalte spontant ved morgenrunden, at natten havde været rolig. Deltog i morgengymnastik og var oplagt. Hjalp med at dække bord til frokost uden at blive bedt om det.',
    reflection:
      'Positiv udvikling ift. søvn som borgeren selv fremhæver i Lys. Dokumentér som støtte til evt. lægefaglig eller psykologisk opfølgning. Opmuntre til at fastholde rutiner der understøtter søvn.',
  },
  'res-008': {
    lysSummary:
      'Lys i dag: check-in 08:45 · humør irritabel · energi lav · tema: venter på besked fra læge.',
    handling:
      'Borgeren virkede anspændt i fællesrum og afviste først deltagelse i gruppeaktivitet. Efter kort samtale deltog i 20 min. med mulighed for at trække sig. Ingen verbale udadreagerende episoder. Mindre verbal kontakt med de andre beboere end sædvanligt.',
    reflection:
      'Uro knyttet til afventet svar fra læge kan påvirke dagsformen. Hold teamet orienteret. Når der foreligger svar, bør borgeren informeres struktureret for at reducere usikkerhed.',
  },
  'res-009': {
    lysSummary:
      'Lys i dag: check-in 07:30 · humør stabilt positivt · energi god · tema: lyst til gåtur og fællesskab om mad.',
    handling:
      'Gennemførte planlagt gåtur (ca. 25 min.) med støtte. Spiste frokost ved bord med tre andre og deltog i smalltalk. Ingen særlige hændelser.',
    reflection:
      'Stabil profil i Lys matcher hverdagsdeltagelse. Vedligehold sociale tilbud — borgeren trives tydeligvis med forudsigelig struktur og fællesskab om måltider.',
  },
  'res-010': {
    lysSummary:
      'Lys i dag: check-in 07:15 · humør meget positivt · energi høj · tema: glæde ved familiebesøg i weekenden.',
    handling:
      'Borgeren delte frivilligt oplevelser fra weekendbesøg med personalet ved morgenkaffe. Deltog aktivt i planlægning af ugeaktiviteter på opslagstavlen. Hjalp en anden beboer med at finde program for ugen.',
    reflection:
      'Stærkt ressourcefokus — familiekontakt og meningsfuld hjælp til anden beboer. Kan bruges i supervision som eksempel på mestring. Vær opmærksom på eventuel “nedtur” efter positive højdepunkter.',
  },
  'res-011': {
    lysSummary:
      'Lys i dag: check-in 08:20 · humør roligt · energi middel · tema: lyst til kreativ aktivitet senere på dagen.',
    handling:
      'Formiddag roligt ophold på værelse med læsning. Borgeren bekræftede ved frokost, at vedkommende ønsker at deltage i eftermiddagens maleaktivitet. Ingen konflikter.',
    reflection:
      'Lys viser klar intention om deltagelse — sørg for at aktiviteten bliver synlig i plan og at borgeren får påmindelse, så forventningen holder.',
  },
  'res-012': {
    lysSummary:
      'Lys i dag: check-in 09:10 · humør træt · energi lav · tema: dårlig søvn pga. støj om natten.',
    handling:
      'Borgeren gav udtryk for træthed og irritation over natlig støj fra gangen. Personale noterede tidspunkt og tilbyder ørepropper og mulighed for hvil før middag. Borgeren accepterede kort lur (ca. 30 min.).',
    reflection:
      'Miljøfaktor (støj) bør adresseres på teammøde — evt. natrutiner eller fysiske tiltag. Følg op i Lys i morgen om søvnkvalitet efter tiltag.',
  },
};

export function getJournalDemoDraft(residentId: string): JournalDemoDraft | null {
  return JOURNAL_DEMO_DRAFTS[residentId] ?? null;
}
