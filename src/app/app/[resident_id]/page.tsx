import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ resident_id: string }>;
}

/**
 * Entry point for device-linked resident access.
 * Visiting /app/<uuid> stores the resident_id in a long-lived cookie
 * and immediately redirects to the app.
 *
 * This URL is typically delivered via QR code or a saved bookmark
 * on the resident's personal device.
 */
export default async function ResidentEntryPage({ params }: Props) {
  const { resident_id } = await params;

  const cookieStore = await cookies();
  cookieStore.set('budr_resident_id', resident_id, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 31536000,
    path: '/',
  });

  redirect('/park-hub');
}
