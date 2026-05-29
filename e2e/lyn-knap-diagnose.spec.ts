/**
 * Diagnose KUN: hvorfor undslipper lyn-knappen telefon-rammen på desktop?
 *
 * Kør (server skal køre på 4028):
 *   PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright test e2e/lyn-knap-diagnose.spec.ts
 *
 * Måler intet andet end lyn-knappen + dens forfædre. Ændrer INTET.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4028';

test('diagnosticér lyn-knappens containing block', async ({ browser }) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    locale: 'da-DK',
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/resident-demo`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  // Luk velkomst hvis den er der
  const spring = page.getByRole('button', { name: /spring over/i });
  if (await spring.first().isVisible().catch(() => false)) {
    await spring.first().click({ force: true });
    await page.waitForTimeout(400);
  }

  const result = await page.evaluate(() => {
    // Find lyn-knappen: fixed, h-14 w-14, rund
    const btns = [...document.querySelectorAll('button')] as HTMLElement[];
    const lyn = btns.find((b) => {
      const s = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return (
        s.position === 'fixed' &&
        r.width >= 48 &&
        r.width <= 64 &&
        r.height >= 48 &&
        r.height <= 64 &&
        Number.parseFloat(s.borderRadius) > 20
      );
    });

    if (!lyn) return { found: false };

    const r = lyn.getBoundingClientRect();
    const s = getComputedStyle(lyn);

    // Gå op gennem forfædrene og find dem der etablerer en containing block
    // for position:fixed (transform/filter/perspective/will-change/contain).
    const ancestors: {
      tag: string;
      cls: string;
      transform: string;
      filter: string;
      perspective: string;
      willChange: string;
      contain: string;
      establishesCB: boolean;
    }[] = [];

    let node: HTMLElement | null = lyn.parentElement;
    let depth = 0;
    while (node && node !== document.body && depth < 25) {
      const cs = getComputedStyle(node);
      const establishesCB =
        (cs.transform !== 'none' && cs.transform !== '') ||
        (cs.filter !== 'none' && cs.filter !== '') ||
        (cs.perspective !== 'none' && cs.perspective !== '') ||
        cs.willChange === 'transform' ||
        cs.willChange === 'filter' ||
        (cs.contain && /paint|layout|strict|content/.test(cs.contain));
      ancestors.push({
        tag: node.tagName.toLowerCase(),
        cls: [...node.classList].slice(0, 4).join('.'),
        transform: cs.transform,
        filter: cs.filter,
        perspective: cs.perspective,
        willChange: cs.willChange,
        contain: cs.contain,
        establishesCB,
      });
      node = node.parentElement;
      depth++;
    }

    return {
      found: true,
      button: {
        left: Math.round(r.left),
        right: Math.round(r.right),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        cssBottom: s.bottom,
        cssRight: s.right,
        cssLeft: s.left,
        position: s.position,
        classes: [...lyn.classList].join(' '),
      },
      ancestors,
    };
  });

  console.log('\n=== LYN-KNAP DIAGNOSE (1440px) ===\n');
  if (!result.found) {
    console.log('Lyn-knap IKKE fundet — er den måske kun synlig efter scroll/interaktion?');
  } else {
    console.log('KNAP:');
    console.log(`  position: ${result.button.position}`);
    console.log(`  box: left=${result.button.left} right=${result.button.right} top=${result.button.top} bottom=${result.button.bottom}`);
    console.log(`  css: bottom=${result.button.cssBottom} right=${result.button.cssRight} left=${result.button.cssLeft}`);
    console.log(`  classes: ${result.button.classes}`);
    console.log('\nFORFÆDRE (nærmest først) — leder efter den der etablerer containing block:');
    result.ancestors.forEach((a, i) => {
      const flag = a.establishesCB ? '  ★ ETABLERER CONTAINING BLOCK' : '';
      console.log(`  [${i}] ${a.tag}.${a.cls}${flag}`);
      if (a.establishesCB) {
        console.log(`        transform=${a.transform} | filter=${a.filter} | will-change=${a.willChange} | contain=${a.contain}`);
      }
    });
    const firstCB = result.ancestors.find((a) => a.establishesCB);
    console.log('\nKONKLUSION:');
    if (firstCB) {
      console.log(`  Lyn-knappen er fixed ift. "${firstCB.tag}.${firstCB.cls}" (første forfader med transform/filter).`);
      console.log('  Hvis det IKKE er telefon-ramme-containeren, er DET problemet.');
    } else {
      console.log('  INGEN forfader etablerer containing block — knappen er fixed ift. viewporten.');
      console.log('  → translateZ(0) når ikke knappen. Fix skal ind på et element MELLEM ramme og knap.');
    }
  }
  console.log('');

  await context.close();
  expect(result.found).toBe(true);
});
