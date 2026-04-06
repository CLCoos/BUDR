import type { Metadata } from 'next';
import SeoIntentLanding from '@/components/marketing/SeoIntentLanding';
import { getSeoIntent } from '@/lib/marketing/seoIntentContent';

const path = '/for-botilbud/journal-og-digital-tilsyn';
const content = getSeoIntent(path)!;

export const metadata: Metadata = {
  ...content.meta,
  alternates: { canonical: path },
};

export default function JournalDigitalTilsynPage() {
  return <SeoIntentLanding content={content} />;
}
