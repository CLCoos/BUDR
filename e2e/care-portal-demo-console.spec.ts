import { test, expect } from '@playwright/test';
import {
  DEMO_GUIDED_TOUR_STEPS,
  DEMO_GUIDED_TOUR_STORAGE_COMPLETED,
} from '../src/lib/carePortalDemoGuidedTour';

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

  test('Afslut lukker tour uden Lys- eller Care Portal-velkomst', async ({ page }) => {
    await page.goto('/care-portal-demo', { waitUntil: 'networkidle' });
    await page.evaluate((key) => localStorage.removeItem(key), DEMO_GUIDED_TOUR_STORAGE_COMPLETED);
    await page.reload({ waitUntil: 'networkidle' });

    await page.getByRole('button', { name: /start guidet tour/i }).click();

    const tourDialog = page.locator('[aria-labelledby="demo-guided-tour-title"]');
    await expect(tourDialog).toBeVisible({ timeout: 10_000 });
    const nextBtn = tourDialog.getByRole('button', { name: /næste|afslut/i });

    for (let i = 0; i < DEMO_GUIDED_TOUR_STEPS.length - 1; i++) {
      const nextStep = DEMO_GUIDED_TOUR_STEPS[i + 1]!;
      const [expectedPath, expectedQuery] = nextStep.path.split('?');
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

    await expect(nextBtn).toHaveText(/afslut/i);
    await nextBtn.click();
    await expect(tourDialog).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Velkommen til Lys')).not.toBeVisible();
    await expect(page.getByText(/Du er Anders M\./i)).not.toBeVisible();
    await expect(
      page.locator('button.fixed.bottom-5').filter({ hasText: /genstart tour/i })
    ).toBeVisible();

    const completed = await page.evaluate(
      (key) => localStorage.getItem(key),
      DEMO_GUIDED_TOUR_STORAGE_COMPLETED
    );
    expect(completed).toBe('1');

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Velkommen til Lys')).not.toBeVisible();
    await expect(page.getByRole('heading', { name: /velkommen til demo/i })).not.toBeVisible();
  });
});
