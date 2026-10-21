import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Sider der skal kunne åbnes uden staff-session (login og nulstilling af adgangskode). */
const PUBLIC_PORTAL_ROUTES = new Set([
  '/care-portal-login',
  '/care-portal-reset-password',
  '/care-portal-update-password',
]);

function pageRoutes(dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      out.push(...pageRoutes(full, `${prefix}/${name.name}`));
    } else if (name.name === 'page.tsx') {
      out.push(prefix || '/');
    }
  }
  return out;
}

function matcherPatterns(): string[] {
  const src = readFileSync(path.join(root, 'middleware.ts'), 'utf8');
  const start = src.indexOf('matcher: [');
  const end = src.indexOf('],', start);
  const block = src.slice(start, end);
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

/** Next matcher `/foo/:path*` dækker børn, ikke selve `/foo`. */
function matcherCovers(route: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern === route) return true;
    if (pattern.endsWith('/:path*')) {
      const prefix = pattern.slice(0, -'/:path*'.length);
      return route.startsWith(`${prefix}/`);
    }
    return false;
  });
}

describe('middleware matcher', () => {
  it('kører staff-tjekket på alle portalsider undtagen login og adgangskode', () => {
    const patterns = matcherPatterns();
    const routes = pageRoutes(path.join(root, 'src/app'), '').filter(
      (route) => route.startsWith('/care-portal-') && !PUBLIC_PORTAL_ROUTES.has(route)
    );
    const missing = routes.filter((route) => !matcherCovers(route, patterns));
    expect(missing).toEqual([]);
    expect(routes).toContain('/care-portal-fagsystem');
  });
});
