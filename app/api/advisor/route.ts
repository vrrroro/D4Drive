import { NextResponse } from 'next/server';
import { errors, handleRouteError } from '@/lib/auth/guards';
import { clientKey, rateLimit } from '@/lib/auth/rate-limit';
import { AdvisorBusyError, AdvisorUnavailableError, askAdvisor } from '@/lib/advisor/run';
import { advisorRequestSchema } from '@/lib/advisor/schema';

/**
 * POST /api/advisor: the floating car advisor (components/advisor).
 *
 *   { messages: [{ role: 'user', content: 'Seven seats for a trip to Coorg' }] }
 *   -> 200 { reply, cars: [{ id, brand, model, pricePerDay, ... }] }
 *
 * Open to signed-out visitors, like the fleet it talks about. Read only: it
 * changes nothing in the database, so it needs no CSRF token. Every message
 * runs a language model on this server's CPU, so each address gets 20
 * messages in 10 minutes.
 *
 * 400 malformed conversation, 429 too many messages, 502 the model is busy
 * or too slow, 503 Ollama is not running or the model is not pulled.
 */

const LIMIT = 20;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`advisor:${clientKey(request)}`, LIMIT, WINDOW_MS);
    if (!limit.allowed) return errors.tooMany(limit.retryAfterSeconds);

    const body: unknown = await request.json().catch(() => null);
    if (body === null) return errors.badRequest('Send a JSON body.');

    const parsed = advisorRequestSchema.safeParse(body);
    if (!parsed.success) return errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid conversation.');

    return NextResponse.json(await askAdvisor(parsed.data.messages));
  } catch (error) {
    if (error instanceof AdvisorUnavailableError) return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof AdvisorBusyError) return NextResponse.json({ error: error.message }, { status: 502 });
    return handleRouteError('advisor', error);
  }
}
