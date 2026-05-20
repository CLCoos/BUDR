import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'resident_session_requires_pin_or_webauthn' }, { status: 403 });
}
