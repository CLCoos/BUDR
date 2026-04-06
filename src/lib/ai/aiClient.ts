export async function callAIEndpoint(endpoint: string, payload: object) {
  try {
    let accessToken: string | undefined;
    if (typeof window !== 'undefined') {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token;
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const detail =
        typeof data.details === 'string' && data.details.trim().length > 0
          ? data.details.trim()
          : null;
      const friendlyMessage =
        response.status === 429
          ? 'Du har ramt dagens gratis AI-grænse. Prøv igen i morgen eller opgrader til premium.'
          : detail || data.error || `Request failed: ${response.status}`;
      console.error('API Route Error:', {
        error: data.error,
        details: data.details,
      });
      throw new Error(friendlyMessage);
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}
