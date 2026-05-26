/**
 * Midlertidig responsive-diagnose: horizontal overflow på demo-sider.
 * Kør: PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright test e2e/mobile-overflow-diagnose.spec.ts
 * Screenshots: diagnostics/mobile-layout/
 */
import { test, expect, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const IPHONE_13 = devices['iPhone 13'];
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4028';

const PAGES = [
  { slug: 'care-portal-demo', path: '/care-portal-demo', dismissWelcome: true },
  {
    slug: 'care-portal-demo-res-sara',
    path: '/care-portal-demo/residents/res-sara',
    dismissWelcome: false,
  },
  { slug: 'care-portal-demo-handover', path: '/care-portal-demo/handover', dismissWelcome: false },
  { slug: 'resident-demo', path: '/resident-demo', dismissWelcome: true },
] as const;

const VIEWPORTS = [
  { label: '360', width: 360, height: 780, isMobile: true, hasTouch: true, dpr: 3 },
  { label: '390', width: 390, height: 844, isMobile: true, hasTouch: true, dpr: 3 },
  { label: '768', width: 768, height: 1024, isMobile: false, hasTouch: true, dpr: 2 },
  { label: '1024', width: 1024, height: 900, isMobile: false, hasTouch: false, dpr: 2 },
  { label: '1440', width: 1440, height: 1024, isMobile: false, hasTouch: false, dpr: 2 },
] as const;

const OUT_DIR = path.join(process.cwd(), 'diagnostics', 'mobile-layout');
const REPORT_PATH = path.join(OUT_DIR, 'report.json');

type OverflowElement = {
  selector: string;
  tag: string;
  width: number;
  left: number;
  right: number;
  overflowRightPx: number;
  overflowLeftPx: number;
  widerThanViewportPx: number;
  /** false = sandsynligvis inde i overflow-x scroll-container (bevidst) */
  causesPageOverflow: boolean;
};

type PageReport = {
  viewportLabel: string;
  path: string;
  slug: string;
  viewportWidth: number;
  scrollWidth: number;
  hasHorizontalOverflow: boolean;
  overflowPx: number;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  offenders: OverflowElement[];
  pageBreakers: OverflowElement[];
  screenshot: string;
  notes: string[];
};

function severityFromOverflow(px: number): PageReport['severity'] {
  if (px <= 0) return 'none';
  if (px <= 8) return 'mild';
  if (px <= 40) return 'moderate';
  return 'severe';
}

async function dismissWelcomeIfNeeded(page: import('@playwright/test').Page) {
  const springOver = page.getByRole('button', { name: /spring over/i });
  if (await springOver.first().isVisible().catch(() => false)) {
    await springOver.first().click({ force: true });
    await page.waitForTimeout(200);
    return;
  }
  const luk = page.getByRole('button', { name: 'Luk' });
  if (await luk.isVisible().catch(() => false)) {
    await luk.first().click({ force: true });
    await page.waitForTimeout(300);
  }
}

async function measureOverflow(page: import('@playwright/test').Page): Promise<{
  viewportWidth: number;
  scrollWidth: number;
  offenders: OverflowElement[];
  pageBreakers: OverflowElement[];
}> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;

    function selectorFor(el: Element): string {
      const html = el as HTMLElement;
      if (html.id) return `#${CSS.escape(html.id)}`;
      const tag = el.tagName.toLowerCase();
      const cls = [...el.classList].filter((c) => !c.startsWith('hover:')).slice(0, 4);
      if (cls.length) return `${tag}.${cls.join('.')}`;
      const parent = el.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter((c) => c.tagName === el.tagName);
        const idx = siblings.indexOf(el);
        if (idx >= 0 && siblings.length > 1) return `${selectorFor(parent)} > ${tag}:nth-of-type(${idx + 1})`;
      }
      return tag;
    }

    function hasHorizontalScrollAncestor(el: Element): boolean {
      let node: Element | null = el.parentElement;
      while (node && node !== document.body) {
        const st = getComputedStyle(node);
        const ox = st.overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'overlay') {
          if (node.scrollWidth > node.clientWidth + 1) return true;
        }
        node = node.parentElement;
      }
      return false;
    }

    function hasHorizontalClipAncestor(el: Element): boolean {
      let node: Element | null = el.parentElement;
      while (node && node !== document.body) {
        const st = getComputedStyle(node);
        const ox = st.overflowX;
        const oy = st.overflowY;
        if (
          ox === 'hidden' ||
          ox === 'clip' ||
          (ox === 'visible' && (oy === 'hidden' || oy === 'clip')) ||
          (ox === 'hidden' && oy === 'visible')
        ) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    }

    const offenders: OverflowElement[] = [];
    const pageBreakers: OverflowElement[] = [];
    const seen = new Set<Element>();

    for (const el of document.querySelectorAll('body *')) {
      if (seen.has(el)) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;

      const overflowRightPx = Math.max(0, rect.right - vw);
      const overflowLeftPx = Math.max(0, -rect.left);
      const widerThanViewportPx = Math.max(0, rect.width - vw);

      if (overflowRightPx < 2 && overflowLeftPx < 2 && widerThanViewportPx < 2) continue;

      const inScrollBox = hasHorizontalScrollAncestor(el);
      const inClipBox = hasHorizontalClipAncestor(el);
      const causesPageOverflow =
        !inScrollBox && !inClipBox && (overflowRightPx >= 2 || overflowLeftPx >= 2);

      seen.add(el);
      const row: OverflowElement = {
        selector: selectorFor(el),
        tag: el.tagName.toLowerCase(),
        width: Math.round(rect.width),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        overflowRightPx: Math.round(overflowRightPx * 10) / 10,
        overflowLeftPx: Math.round(overflowLeftPx * 10) / 10,
        widerThanViewportPx: Math.round(widerThanViewportPx * 10) / 10,
        causesPageOverflow,
      };
      offenders.push(row);
      if (causesPageOverflow) pageBreakers.push(row);
    }

    const sortBy = (a: OverflowElement, b: OverflowElement) => {
      const scoreA = a.overflowRightPx + a.overflowLeftPx + a.widerThanViewportPx;
      const scoreB = b.overflowRightPx + b.overflowLeftPx + b.widerThanViewportPx;
      return scoreB - scoreA;
    };
    offenders.sort(sortBy);
    pageBreakers.sort(sortBy);

    return {
      viewportWidth: vw,
      scrollWidth: scrollW,
      offenders: offenders.slice(0, 15),
      pageBreakers: pageBreakers.slice(0, 15),
    };
  });
}

test.describe('Responsive overflow-diagnose', () => {
  test('scan demo-sider på flere bredder og gem rapport', async ({ browser }) => {
    test.setTimeout(240_000);
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const reports: PageReport[] = [];

    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.dpr,
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        userAgent: viewport.isMobile ? IPHONE_13.userAgent : undefined,
        locale: 'da-DK',
      });
      const page = await context.newPage();

      for (const entry of PAGES) {
        await page.goto(`${BASE_URL}${entry.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(800);

        if (entry.dismissWelcome) {
          await dismissWelcomeIfNeeded(page);
          await page.waitForTimeout(500);
        }

        const shotViewport = path.join(
          OUT_DIR,
          `${viewport.width}px-${entry.slug}-viewport.png`
        );
        const shotFull = path.join(OUT_DIR, `${viewport.width}px-${entry.slug}-full.png`);
        await page.screenshot({ path: shotViewport, fullPage: false });
        await page.screenshot({ path: shotFull, fullPage: true });

        const { viewportWidth, scrollWidth, offenders, pageBreakers } = await measureOverflow(page);
        const overflowPx = Math.max(0, scrollWidth - viewportWidth);
        const notes: string[] = [];

        if (offenders.some((o) => o.widerThanViewportPx > 100 && !o.causesPageOverflow)) {
          notes.push(
            'Bredt indhold i horisontal scroll-container (fx tabel) — dokument-scroll er 0, men brugeren skal swipe i widget.'
          );
        }

        reports.push({
          viewportLabel: viewport.label,
          path: entry.path,
          slug: entry.slug,
          viewportWidth,
          scrollWidth,
          hasHorizontalOverflow: overflowPx > 0 || pageBreakers.length > 0,
          overflowPx: Math.max(
            overflowPx,
            ...pageBreakers.map((o) => Math.max(o.overflowRightPx, o.overflowLeftPx)),
            0
          ),
          severity:
            pageBreakers.length > 0
              ? severityFromOverflow(
                  Math.max(
                    ...pageBreakers.map((o) => Math.max(o.overflowRightPx, o.overflowLeftPx))
                  )
                )
              : severityFromOverflow(overflowPx),
          offenders,
          pageBreakers,
          screenshot: shotViewport,
          notes,
        });
      }

      await context.close();
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      viewports: VIEWPORTS,
      pages: reports,
      matrix: VIEWPORTS.map((viewport) => ({
        viewport: viewport.label,
        results: PAGES.map((entry) => {
          const report = reports.find(
            (r) => r.viewportLabel === viewport.label && r.path === entry.path
          );
          return {
            path: entry.path,
            hasHorizontalOverflow: report?.hasHorizontalOverflow ?? false,
            overflowPx: report?.overflowPx ?? 0,
            severity: report?.severity ?? 'none',
          };
        }),
      })),
    };

    fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));

    // Console summary for CI/local runs
    console.log('\n=== Responsive overflow-diagnose ===\n');
    for (const r of reports) {
      console.log(`[${r.viewportLabel}px] ${r.path}`);
      console.log(
        `  overflow: ${r.hasHorizontalOverflow ? 'JA' : 'nej'} (${r.overflowPx}px, ${r.severity}) · scroll ${r.scrollWidth} / viewport ${r.viewportWidth}`
      );
      if (r.pageBreakers.length > 0) {
        console.log('  Side-overflow (bryder layout):');
        for (const o of r.pageBreakers.slice(0, 5)) {
          console.log(
            `    - ${o.selector} (${o.tag}) bred=${o.width}px right=${o.right}px +${o.overflowRightPx}px`
          );
        }
      }
      if (r.offenders.length > 0) {
        console.log('  Bredt indhold (inkl. scroll-containere):');
        for (const o of r.offenders.slice(0, 5)) {
          console.log(
            `    - ${o.selector} (${o.tag}) bred=${o.width}px +${o.overflowRightPx}px${o.causesPageOverflow ? ' [PAGE]' : ' [scroll-box]'}`
          );
        }
      }
      for (const n of r.notes) console.log(`  Note: ${n}`);
      console.log(`  screenshot (viewport): ${r.screenshot}`);
      console.log(`  screenshot (full): ${r.screenshot.replace('-viewport.png', '-full.png')}\n`);
    }
    console.log(`Fuld rapport: ${REPORT_PATH}\n`);

    expect(reports.length).toBe(PAGES.length * VIEWPORTS.length);
  });
});
