import { errors } from '@/lib/auth/guards';
import { clientKey, rateLimit } from '@/lib/auth/rate-limit';
import { AdvisorBusyError, AdvisorUnavailableError, askAdvisor } from '@/lib/advisor/run';
import { advisorRequestSchema, type AdvisorEvent } from '@/lib/advisor/schema';

/**
 * POST /api/advisor: the floating car advisor (components/advisor).
 *
 *   { messages: [{ role: 'user', content: 'Seven seats for a trip to Coorg' }] }
 *   -> 200, application/x-ndjson, one event a line:
 *        { type: 'draft', text }           the checked reply so far, as it is written
 *        { type: 'done', reply, cars }     the final reply and the cars it links
 *        { type: 'error', status, error }  502 busy or too slow, 503 Ollama is off, 500
 *
 * Open to signed-out visitors, like the fleet it talks about. Read only: it
 * changes nothing in the database, so it needs no CSRF token. Every message
 * runs a language model on this server's CPU, so each address gets 20
 * messages in 10 minutes, and a visitor who leaves stops the model.
 *
 * 400 malformed conversation and 429 too many messages come back as plain
 * JSON errors, before anything is streamed. Once the stream has started the
 * status is 200, so a later failure travels as an `error` event.
 */

const LIMIT = 20;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const limit = rateLimit(`advisor:${clientKey(request)}`, LIMIT, WINDOW_MS);
  if (!limit.allowed) return errors.tooMany(limit.retryAfterSeconds);

  const body: unknown = await request.json().catch(() => null);
  if (body === null) return errors.badRequest('Send a JSON body.');

  const parsed = advisorRequestSchema.safeParse(body);
  if (!parsed.success) return errors.badRequest(parsed.error.issues[0]?.message ?? 'Invalid conversation.');

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AdvisorEvent) => {
        if (request.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The visitor closed the page mid-answer.
        }
      };
      try {
        const result = await askAdvisor(parsed.data.messages, {
          signal: request.signal,
          onDraft: (text) => send({ type: 'draft', text }),
        });
        send({ type: 'done', ...result });
      } catch (error) {
        if (error instanceof AdvisorUnavailableError) send({ type: 'error', status: 503, error: error.message });
        else if (error instanceof AdvisorBusyError) send({ type: 'error', status: 502, error: error.message });
        else if (!request.signal.aborted) {
          console.error('[advisor]', error);
          send({ type: 'error', status: 500, error: 'Something went wrong. Please try again.' });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed with the connection.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      // Ask any proxy in front not to buffer the stream.
      'X-Accel-Buffering': 'no',
    },
  });
}
