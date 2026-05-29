/**
 * Showroom-verifikation for /resident-demo telefon-ramme.
 *
 * Kør (samme mønster som dit eksisterende diagnose-script):
 *   PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright test e2e/resident-demo-showroom.spec.ts
 *
 * Forudsætter at dev/preview-serveren kører på BASE_URL (default 127.0.0.1:4028).
 * Screenshots + rapport: diagnostics/showroom/
 *
 * Tjekker tre ting objektivt:
 *   1. DESKTOP (1440/1024): telefon-ramme synlig, OG fixed-elementer (lyn-knap,
 *      bundmenu) ligger INDE i rammens vandrette grænser — ikke ude ved
 *      browservinduets kanter.
 *   2. MOBIL (360/390): telefon-ramme + tekstpanel SKJULT, app fylder skærmen.
 *   3. ALLE bredder: ingen vandret side-overflow (genbrugt fra dit script).
 */
import { test, expect, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const IPHONE_13 = devices['iPhone 13'];
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4028';
const PATHNAME = '/resident-demo';

const VIEWPORTS = [
  { label: '360', width: 360, height: 780, isMobile: true, hasTouch: true, dpr: 3, kind: 'mobile' },
  { label: '390', width: 390, height: 844, isMobile: true, hasTouch: true, dpr: 3, kind: 'mobile' },
  { label: '768', width: 768, height: 1024, isMobile: false, hasTouch: true, dpr: 2, kind: 'mobile' },
  { label: '1024', width: 1024, height: 900, isMobile: false, hasTouch: false, dpr: 2, kind: 'desktop' },
  { label: '1440', width: 1440, height: 1024, isMobile: false, hasTouch: false, dpr: 2, kind: 'desktop' },
] as const;

const OUT_DIR = path.join(process.cwd(), 'diagnostics', 'showroom');
const REPORT_PATH = path.join(OUT_DIR, 'report.json');

async function dismissWelcomeIfNeeded(page: import('@playwright/test').Page) {
  const springOver = page.getByRole('button', { name: /spring over/i });
  if (await springOver.first().isVisible().catch(() => false)) {
    await springOver.first().click({ force: true });
    await page.waitForTimeout(250);
    return;
  }
  const luk = page.getByRole('button', { name: 'Luk' });
  if (await luk.isVisible().catch(() => false)) {
    await luk.first().click({ force: true });
    await page.waitForTimeout(300);
  }
}

/** Måler vandret side-overflow (forenklet udgave af dit diagnose-script). */
async function measurePageOverflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    return { viewportWidth: vw, scrollWidth: scrollW, overflowPx: Math.max(0, scrollW - vw) };
  });
}

/**
 * Finder telefon-rammens indre skærm (containeren med transform/overflow-hidden
 * der wrapper LysShell). Vi leder efter et element der:
 *   - er synligt
 *   - har en bredde tæt på 390px (rammens faste bredde)
 *   - IKKE fylder hele viewporten
 * Returnerer dens bounding box, eller null hvis ingen ramme findes.
 */
async function findPhoneFrame(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll('body *')] as HTMLElement[];
    for (const el of candidates) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      // Rammens indre skærm: ca. 360-420px bred, høj, og ikke fuld-viewport
      const looksLikeFrame =
        rect.width >= 360 &&
        rect.width <= 430 &&
        rect.height >= 500 &&
        rect.left > 8 && // ikke klistret til venstre kant
        (style.transform !== 'none' || style.overflow === 'hidden' || style.overflowX === 'hidden');
      if (looksLikeFrame) {
        return {
          found: true,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
        };
      }
    }
    return { found: false, left: 0, right: 0, width: 0, top: 0, bottom: 0 };
  });
}

/**
 * Finder alle position:fixed elementer der er synlige og ikke er demo-banneret
 * i toppen. Returnerer deres bounding boxes, så vi kan tjekke om de ligger inde
 * i telefon-rammen.
 */
async function findFixedElements(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const out: { selector: string; left: number; right: number; width: number; top: number }[] = [];
    for (const el of document.querySelectorAll('body *')) {
      const style = getComputedStyle(el);
      if (style.position !== 'fixed') continue;
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      // Spring demo-banneret over: det ER meningen det skal være fuld bredde i toppen.
      if (rect.top < 40 && rect.width > 600) continue;
      const cls = [...el.classList].slice(0, 3).join('.');
      out.push({
        selector: `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        top: Math.round(rect.top),
      });
    }
    return out;
  });
}

type Row = {
  viewport: string;
  kind: string;
  overflowPx: number;
  frameFound: boolean;
  frameBox: { left: number; right: number; width: number } | null;
  fixedOutsideFrame: { selector: string; left: number; right: number }[];
  verdict: 'OK' | 'FEJL';
  problems: string[];
};

test.describe('Resident-demo showroom-ramme', () => {
  test('verificér telefon-ramme, fixed-indeslutning og overflow', async ({ browser }) => {
    test.setTimeout(180_000);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const rows: Row[] = [];

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.dpr,
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        userAgent: vp.isMobile ? IPHONE_13.userAgent : undefined,
        locale: 'da-DK',
      });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}${PATHNAME}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      await dismissWelcomeIfNeeded(page);
      await page.waitForTimeout(500);

      await page.screenshot({ path: path.join(OUT_DIR, `${vp.width}px-viewport.png`), fullPage: false });
      await page.screenshot({ path: path.join(OUT_DIR, `${vp.width}px-full.png`), fullPage: true });

      const { overflowPx } = await measurePageOverflow(page);
      const frame = await findPhoneFrame(page);
      const fixedEls = await findFixedElements(page);

      const problems: string[] = [];

      // Tjek 1: overflow må aldrig forekomme (>2px tolerance)
      if (overflowPx > 2) problems.push(`Vandret overflow: ${overflowPx}px`);

      if (vp.kind === 'desktop') {
        // Tjek 2: ramme SKAL findes på desktop
        if (!frame.found) {
          problems.push('Telefon-ramme blev ikke fundet på desktop');
        } else {
          // Tjek 3: fixed-elementer skal ligge inde i rammen (med 4px slæk)
          for (const f of fixedEls) {
            const insideHoriz = f.left >= frame.left - 4 && f.right <= frame.right + 4;
            if (!insideHoriz) {
              problems.push(
                `Fixed-element bryder ud af ramme: ${f.selector} (left=${f.left} right=${f.right} vs ramme ${frame.left}-${frame.right})`
              );
            }
          }
        }
      } else {
        // MOBIL: ramme må IKKE være synlig (app skal fylde skærmen)
        if (frame.found && frame.left > 8) {
          problems.push(`Telefon-ramme er synlig på mobil (left=${frame.left}) — burde være skjult`);
        }
      }

      const fixedOutsideFrame =
        vp.kind === 'desktop' && frame.found
          ? fixedEls
              .filter((f) => !(f.left >= frame.left - 4 && f.right <= frame.right + 4))
              .map((f) => ({ selector: f.selector, left: f.left, right: f.right }))
          : [];

      rows.push({
        viewport: vp.label,
        kind: vp.kind,
        overflowPx,
        frameFound: frame.found,
        frameBox: frame.found ? { left: frame.left, right: frame.right, width: frame.width } : null,
        fixedOutsideFrame,
        verdict: problems.length === 0 ? 'OK' : 'FEJL',
        problems,
      });

      await context.close();
    }

    fs.writeFileSync(
      REPORT_PATH,
      JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE_URL, rows }, null, 2)
    );

    console.log('\n=== SHOWROOM-VERIFIKATION /resident-demo ===\n');
    for (const r of rows) {
      console.log(`[${r.viewport}px · ${r.kind}]  ${r.verdict}`);
      console.log(`  overflow: ${r.overflowPx}px`);
      console.log(`  ramme fundet: ${r.frameFound ? 'JA' : 'nej'}${r.frameBox ? ` (${r.frameBox.left}-${r.frameBox.right}, bred ${r.frameBox.width}px)` : ''}`);
      if (r.problems.length) {
        for (const p of r.problems) console.log(`  ⚠ ${p}`);
      }
      console.log(`  screenshot: diagnostics/showroom/${r.viewport === '360' || r.viewport === '390' || r.viewport === '768' ? r.viewport : r.viewport}px-viewport.png\n`);
    }
    const fejl = rows.filter((r) => r.verdict === 'FEJL');
    console.log(fejl.length === 0 ? '✓ ALT OK\n' : `✗ ${fejl.length} viewport(s) med problemer\n`);
    console.log(`Fuld rapport: diagnostics/showroom/report.json\n`);

    // Vi lader testen "bestå" uanset, så du altid får screenshots + rapport at kigge i.
    // (Skift til expect(fejl.length).toBe(0) hvis du vil have hård CI-fejl.)
    expect(rows.length).toBe(VIEWPORTS.length);
  });
});
