/**
 * Fælles DEMO-branding for Care Portal-demo (`/care-portal-demo/*`).
 * Bruges til konsistent navngivning og synlig markering overalt i demoen.
 */

/** Fiktivt bosted — ingen kobling til virkelige organisationer. */
export const CARE_PORTAL_DEMO_FACILITY_NAME = 'Bosted Solhaven';

/** Fast DEMO-bånd under topnav (px). Skal matche `DemoModeRibbon` + padding i `CarePortalDemoShell`. */
export const CARE_PORTAL_DEMO_RIBBON_BELOW_NAV_PX = 40;

/** Afstand fra viewport-top til start af scroll-indhold (topnav + DEMO-bånd). */
export const CARE_PORTAL_DEMO_STACK_TOP_PX = 52 + CARE_PORTAL_DEMO_RIBBON_BELOW_NAV_PX;

export const CARE_PORTAL_DEMO_DISCLAIMER_SHORT =
  'DEMO: Alle personer, journaluddrag og hændelser er fiktive. Ikke klinisk dokumentation.';
