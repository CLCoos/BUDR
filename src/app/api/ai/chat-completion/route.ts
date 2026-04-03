import { NextRequest, NextResponse } from 'next/server';
import { completion } from '@rocketnew/llm-sdk';
import { createClient } from '@supabase/supabase-js';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';

const API_KEYS: Record<string, string | undefined> = {
  OPEN_AI: process.env.OPENAI_API_KEY,
  ANTHROPIC: process.env.ANTHROPIC_API_KEY,
  GEMINI: process.env.GEMINI_API_KEY,
  PERPLEXITY: process.env.PERPLEXITY_API_KEY,
};

const DAILY_AI_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 20);

async function consumeDailyAiCall(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return {
      ok: false,
      status: 500,
      error: 'Supabase environment is not fully configured for AI usage gating',
    };
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    // Allow non-authenticated sessions; only enforce per-user quota when a valid user token exists.
    return { ok: true, remaining: null as number | null };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);

  if (userError || !user) {
    // Fail open for usage gating to avoid blocking AI features due to auth/session edge-cases.
    return { ok: true, remaining: null as number | null };
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const today = new Date().toISOString().slice(0, 10);

  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const userRole = profile?.role ?? 'user';
  if (userRole === 'staff' || userRole === 'admin' || userRole === 'premium') {
    return { ok: true, remaining: null as number | null };
  }

  const { data: row, error: rowError } = await serviceClient
    .from('ai_daily_usage')
    .select('id, call_count')
    .eq('user_id', user.id)
    .eq('usage_date', today)
    .maybeSingle();

  if (rowError) {
    return { ok: false, status: 500, error: 'Failed to read AI usage counter' };
  }

  if (!row) {
    const { error: insertError } = await serviceClient.from('ai_daily_usage').insert({
      user_id: user.id,
      usage_date: today,
      call_count: 1,
    });
    if (insertError) {
      return { ok: false, status: 500, error: 'Failed to initialize AI usage counter' };
    }
    return { ok: true, remaining: DAILY_AI_LIMIT - 1 };
  }

  if (row.call_count >= DAILY_AI_LIMIT) {
    return { ok: false, status: 429, error: `Daily AI limit reached (${DAILY_AI_LIMIT})` };
  }

  const { error: updateError } = await serviceClient
    .from('ai_daily_usage')
    .update({ call_count: row.call_count + 1 })
    .eq('id', row.id);

  if (updateError) {
    return { ok: false, status: 500, error: 'Failed to update AI usage counter' };
  }

  return { ok: true, remaining: DAILY_AI_LIMIT - (row.call_count + 1) };
}

function formatErrorResponse(error: unknown, provider?: string) {
  const err = error as Record<string, unknown> & {
    statusCode?: number;
    status?: number;
    llmProvider?: string;
    body?: { error?: { message?: string }; message?: string };
  };
  const statusCode = err?.statusCode || err?.status || 500;
  const providerName = err?.llmProvider || provider || 'Unknown';

  let details = error instanceof Error ? error.message : String(error);
  const body = err?.body;
  if (body && typeof body === 'object') {
    const nested = (body as { error?: { message?: string } }).error?.message;
    const top = (body as { message?: string }).message;
    if (typeof nested === 'string' && nested.trim()) {
      details = nested;
    } else if (typeof top === 'string' && top.trim()) {
      details = top;
    }
  }

  return {
    error: `${String(providerName).toUpperCase()} API error: ${statusCode}`,
    details,
    statusCode,
  };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
    const provider = body.provider;
    const model = body.model;
    const messages = body.messages;
    const stream = Boolean(body.stream);
    const parameters =
      typeof body.parameters === 'object' && body.parameters !== null ? body.parameters : {};

    if (typeof provider !== 'string' || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields: provider, messages',
          details: 'Request validation failed',
        },
        { status: 400 }
      );
    }

    const effectiveModel =
      provider === 'ANTHROPIC'
        ? process.env.ANTHROPIC_MODEL?.trim() || ANTHROPIC_CHAT_MODEL
        : typeof model === 'string'
          ? model
          : '';

    if (!effectiveModel) {
      return NextResponse.json(
        { error: 'Missing required field: model', details: 'Request validation failed' },
        { status: 400 }
      );
    }

    const usage = await consumeDailyAiCall(request);
    if (!usage.ok) {
      return NextResponse.json(
        { error: usage.error, details: 'Freemium daily AI gate blocked this request' },
        { status: usage.status }
      );
    }

    const apiKey = API_KEYS[provider];
    if (!apiKey) {
      return NextResponse.json(
        {
          error: `${provider.toUpperCase()} API key is not configured`,
          details: 'The API key for this provider is missing in environment variables',
        },
        { status: 400 }
      );
    }

    if (stream) {
      const response = await completion({
        model: effectiveModel,
        messages,
        stream: true,
        api_key: apiKey,
        ...(parameters as Record<string, unknown>),
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));

            for await (const chunk of response as unknown as AsyncIterable<unknown>) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'chunk', chunk })}\n\n`)
              );
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
          } catch (error) {
            const formatted = formatErrorResponse(error, provider);
            console.error('API Route Error:', {
              error: formatted.error,
              details: formatted.details,
              model: effectiveModel,
            });
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'error', error: formatted.details })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return new NextResponse(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          ...(usage.remaining !== null ? { 'x-ai-remaining-today': String(usage.remaining) } : {}),
        },
      });
    }

    const response = await completion({
      model: effectiveModel,
      messages,
      stream: false,
      api_key: apiKey,
      ...(parameters as Record<string, unknown>),
    });

    return NextResponse.json(response, {
      headers:
        usage.remaining !== null ? { 'x-ai-remaining-today': String(usage.remaining) } : undefined,
    });
  } catch (error) {
    const formatted = formatErrorResponse(
      error,
      typeof body?.provider === 'string' ? body.provider : undefined
    );
    console.error('API Route Error:', { error: formatted.error, details: formatted.details });
    return NextResponse.json(
      { error: formatted.error, details: formatted.details },
      { status: formatted.statusCode }
    );
  }
}
