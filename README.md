# BUDR (budr-luksus)

**Projektkontekst:** [`CONTEXT.md`](./CONTEXT.md) · **AI/onboarding:** [`AGENTS.md`](./AGENTS.md)

Underneath: Next.js 15 app (TypeScript, Tailwind). Marketing + Care Portal + Lys (`/park-hub`).

## 🚀 Features

- **Next.js 15** - Latest version with improved performance and features
- **React 19** - Latest React version with enhanced capabilities
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development

## 🛠️ Installation

1. Install dependencies:
  ```bash
  npm install
  # or
  yarn install
  ```

2. Start the development server:
  ```bash
  npm run dev
  # or
  yarn dev
  ```
3. Open [http://localhost:4028](http://localhost:4028) with your browser to see the result.

**Lighthouse (performance, marketing-side uden forsidesplash):** `npm run build`, start prod på 4028 (`npx next start -p 4028`), derefter i et andet terminal: `npm run lighthouse:institutioner` — skriver `lighthouse-institutioner.html` i projektroden.

## 📁 Project Structure

```
nextjs/
├── public/             # Static assets
├── src/
│   ├── app/            # App router components
│   │   ├── layout.tsx  # Root layout component
│   │   └── page.tsx    # Main page component
│   ├── components/     # Reusable UI components
│   ├── styles/         # Global styles and Tailwind configuration
├── next.config.mjs     # Next.js configuration
├── package.json        # Project dependencies and scripts
├── postcss.config.js   # PostCSS configuration
└── tailwind.config.js  # Tailwind CSS configuration

```

## 🧩 Page Editing

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## 🎨 Styling

This project uses Tailwind CSS for styling with the following features:
- Utility-first approach for rapid development
- Custom theme configuration
- Responsive design utilities
- PostCSS and Autoprefixer integration

## 📦 Available Scripts

- `npm run dev` - Start development server on port 4028
- `npm run build` - Build the application for production
- `npm run start` - Start the development server
- `npm run serve` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier

## 🔄 Session handoff (obligatorisk)

Efter **hver** session med kodeændringer:

1. Opdater `CONTEXT.md` (dato + kort status snapshot af leverede ændringer).
2. Opdater relevante docs (typisk `README.md`), hvis workflows, ruter eller driftskrav ændres.
3. Kør minimum `npm run lint` og helst `npm run type-check && npm run build` før aflevering.

## Care Portal — journal AI (kvalitet)

**Fagliggør med AI** (`/api/portal/journal-polish`) bruger Anthropic. For at tune sprog og pålidelighed:

1. Sæt **`ANTHROPIC_JOURNAL_POLISH_MODEL`** i **Netlify → Site → Environment variables** (Production) eller i **`.env.local`** lokalt til et model-id, din Anthropic-konto understøtter (se [Anthropics modeloversigt](https://docs.anthropic.com/en/docs/about-claude/models)).
2. Uden variabel bruges `ANTHROPIC_CHAT_MODEL` fra `src/lib/ai/anthropicModel.ts` og derefter intern fallback — se `src/lib/ai/anthropicJournalPolish.ts`.
3. Efter ændring på Netlify: **deploy igen**. Lokalt: genstart `npm run dev`.

Detaljer og sikkerhed: [`CONTEXT.md`](./CONTEXT.md) → *Environment variables*.

## 📱 Deployment

Build the application for production:

  ```bash
  npm run build
  ```

## 📚 Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

You can check out the [Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🙏 Acknowledgments

- Built with [Rocket.new](https://rocket.new)
- Powered by Next.js and React
- Styled with Tailwind CSS

Built with ❤️ on Rocket.new