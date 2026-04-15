# TODO — Næste opgaver

Slet linjen når opgaven er klaret. Filen kan slettes helt når den er tom.

---

## Skal gøres (blokerer troværdighed)

- [ ] **Cal.com booking-link** — Opret konto på [cal.com](https://cal.com) med hej@budrcare.dk → "New event type" → "20 min demo" → kopiér link → indsæt i `src/components/marketing/InstitutionerPage.tsx` linje 13 (`BOOKING_URL`). Slet denne linje når linket er live.

- [x] **Product visuals** — `LandingInteractiveDemo` tilføjet til forsiden (`HomeLandingPage.tsx`) i sektion `#live-demo` mellem problem og løsning. Dynamisk importeret (ssr: false). Fungerer med den rigtige logik, ikke animation.

- [x] **OG-billeder** — `src/app/opengraph-image.tsx` og `src/app/institutioner/opengraph-image.tsx` oprettet. Genereres dynamisk via `next/og` (edge runtime). Mørk baggrund, brand-farver, relevant headline per side.

---

## Bør gøres (kvalitet og konvertering)

- [x] **Footer på marketing-sider** — Delt `MarketingFooter`-komponent oprettet (`src/components/marketing/MarketingFooter.tsx`), tilføjet til `HomeLandingPage` og `InstitutionerPage`. Links til produkter, information, juridisk og hej@budrcare.dk.

- [x] **"USP 01/02/03"-labels** — Erstattet med `Borger i centrum`, `Metode`, `Implementering` i `HomeLandingPage.tsx`.

- [x] **FAQ / indvendingshåndtering** — Sektion `#faq` tilføjet til `/institutioner` med 5 `<details>`-items: IT-godkendelse, pris, personalemodstand, GDPR, systemintegration. CSS i `budr-landing.css` (`.inst-faq-*`).

- [x] **Nav på /institutioner** — Anker-nav tilføjet til brand-rækken: Problem · Løsningen · For hvem · Implementering + "Book demo"-knap. CSS i `budr-landing.css` (`.institutioner-nav-links`).

- [x] **`LandingInteractiveDemo` på forsiden** — Se kritiske opgaver ovenfor.
