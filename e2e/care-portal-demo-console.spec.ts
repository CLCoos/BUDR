import { test, expect } from '@playwright/test';
import { DEMO_GUIDED_TOUR_STEPS } from '../src/lib/carePortalDemoGuidedTour';

const DEMO_PAGES = [
  { name: 'dashboard', path: '/care-portal-demo' },
  { name: 'residents', path: '/care-portal-demo/residents' },
  { name: 'resident-sara', path: '/care-portal-demo/residents/res-sara' },
  { name: 'handover', path: '/care-portal-demo/handover' },
  { name: 'beskeder', path: '/care-portal-demo/beskeder' },
  { name: 'vagtplan', path: '/care-portal-demo/vagtplan' },
] as const;

const MAX_DEPTH_RE = /maximum update depth exceeded/i;

async function dismissWelcomeOverlay(page: import('@playwright/test').Page) {
  const close = page.getByRole('button', { name: 'Luk' });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

test.describe('Care Portal demo — console errors', () => {
  for (const { name, path } of DEMO_PAGES) {
    test(`${name}: no Maximum update depth`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(path, { waitUntil: 'networkidle' });
      await dismissWelcomeOverlay(page);
      await page.waitForTimeout(2500);

      const depthErrors = errors.filter((t) => MAX_DEPTH_RE.test(t));
      expect(depthErrors, `console errors on ${path}:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('Care Portal demo — guided tour navigation', () => {
  test('goNext advances URL through tour steps', async ({ page }) => {
    await page.goto('/care-portal-demo', { waitUntil: 'networkidle' });
    await dismissWelcomeOverlay(page);

    const tourFab = page.locator('button.fixed.bottom-5').filter({ hasText: /guidet tour|genstart tour/i });
    await tourFab.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    const nextBtn = dialog.getByRole('button', { name: /næste|afslut/i });

    for (let i = 0; i < DEMO_GUIDED_TOUR_STEPS.length - 1; i++) {
      const nextStep = DEMO_GUIDED_TOUR_STEPS[i + 1]!;
      const [expectedPath, expectedQuery] = nextStep.path.split('?');
      await expect(nextBtn).toBeVisible();
      await nextBtn.click();
      await page.waitForURL(
        (url) => {
          if (!url.pathname.startsWith(expectedPath)) return false;
          if (!expectedQuery) return true;
          const want = new URLSearchParams(expectedQuery);
          for (const [k, v] of want.entries()) {
            if (url.searchParams.get(k) !== v) return false;
          }
          return true;
        },
        { timeout: 12_000 }
      );
    }
  });
});
