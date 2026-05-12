import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ resident_id: string }>;
}

/**
 * Entry point for device-linked resident access.
 * Visiting /app/<uuid> starts the resident login flow.
 *
 * This URL is typically delivered via QR code or a saved bookmark
 * on the resident's personal device.
 */
export default async function ResidentEntryPage({ params }: Props) {
  const { resident_id } = await params;
  redirect(`/login/${encodeURIComponent(resident_id)}?redirectTo=/park-hub`);
}
