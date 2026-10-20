import { DELIVERY_TIERS } from '@/lib/constants';
import { ADVISOR_SYSTEM, todayLine } from '@/lib/advisor/prompt';
import { cleanReply, mentionedCars, numbersIn, soundsFactual, ungroundedAmounts } from '@/lib/advisor/reply';
import { ADVISOR_TOOLS, type AdvisorCar, type AdvisorReply, type AdvisorTurn } from '@/lib/advisor/schema';
import { runTool } from '@/lib/advisor/tools';

/**
 * The car advisor: one visitor message in, one recommendation out.
 *
 * A tool-calling loop over a language model that runs on this machine,
 * served by Ollama (ollama.com) on its local REST API, /api/chat. The model
 * reads the conversation, calls search_fleet and check_availability
 * (tools.ts, which run parameterised SQL and fn_car_available), reads the
 * rows, and answers. The loop ends when it stops calling tools, or after
 * MAX_ROUNDS.
 *
 * Nothing leaves the server: no API key, no third party, no quota. The
 * browser talks only to /api/advisor (the page's CSP keeps connect-src
 * 'self'), and this file talks only to Ollama on OLLAMA_HOST.
 */

const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');

/** Small enough for a laptop CPU, and reliable at tool calls. `ollama pull qwen2.5:3b`. */
export const ADVISOR_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

/** Enough for a search, a few availability checks, a correction and the answer. */
const MAX_ROUNDS = 6;

/** Drafts sent back for not resting on the tools, before giving up. */
const MAX_CORRECTIONS = 2;

/** On a CPU a round (reading the prompt, then writing) can take a while. */
const ROUND_TIMEOUT_MS = 120_000;

/** The advisor cannot be used here: Ollama is not running, or the model is not pulled. */
export class AdvisorUnavailableError extends Error {
  constructor() {
    super('The car advisor is not switched on here yet.');
    this.name = 'AdvisorUnavailableError';
  }
}

/** The model is overloaded or too slow for the moment. */
export class AdvisorBusyError extends Error {
  constructor() {
    super('The car advisor is busy. Try again in a minute.');
    this.name = 'AdvisorBusyError';
  }
}

const TOO_LONG = 'That needed more searching than I can do in one go. Could you tell me a little more about what you need?';
const EMPTY = 'Sorry, I lost my train of thought. Could you ask that again?';
const UNSURE = 'I could not check that against the fleet just now. Could you tell me how many people are coming and your budget a day?';

/** Ollama's chat message, as /api/chat sends and receives it. */
interface OllamaToolCall {
  function: { name: string; arguments: Record<string, unknown> | string };
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_name?: string;
}

interface OllamaChatResponse {
  message?: OllamaMessage;
  error?: string;
}

async function chat(messages: OllamaMessage[]): Promise<OllamaMessage> {
  let response: Response;
  try {
    response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ADVISOR_MODEL,
        messages,
        tools: ADVISOR_TOOLS,
        stream: false,
        // Keep the model loaded between messages, so only the first is slow.
        keep_alive: '15m',
        // Low temperature: it should pick from the rows, not improvise.
        options: { temperature: 0.2, num_ctx: 8192 },
      }),
      signal: AbortSignal.timeout(ROUND_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      console.warn('[advisor] the model took longer than', ROUND_TIMEOUT_MS, 'ms');
      throw new AdvisorBusyError();
    }
    // Connection refused: Ollama is not running on OLLAMA_HOST.
    console.error('[advisor] could not reach Ollama at', OLLAMA_HOST);
    throw new AdvisorUnavailableError();
  }

  const body = (await response.json().catch(() => ({}))) as OllamaChatResponse;
  if (response.status === 404) {
    console.error(`[advisor] model ${ADVISOR_MODEL} is not pulled: run "ollama pull ${ADVISOR_MODEL}"`);
    throw new AdvisorUnavailableError();
  }
  if (!response.ok || !body.message) {
    console.warn('[advisor] Ollama answered', response.status, body.error ?? '');
    throw new AdvisorBusyError();
  }
  return body.message;
}

/** Arguments arrive as an object, or from some models as a JSON string. */
function parseArgs(args: Record<string, unknown> | string): unknown {
  if (typeof args !== 'string') return args;
  try {
    return JSON.parse(args) as unknown;
  } catch {
    return null;
  }
}

/**
 * Small models now and then write a tool call as plain text instead of
 * using tool_calls. A reply that is nothing but {"name": ..., "arguments":
 * ...} naming one of our tools is taken as the call it meant to make.
 */
function toolCallInText(content: string): OllamaToolCall[] {
  const text = content.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  if (!text.startsWith('{')) return [];
  try {
    const parsed = JSON.parse(text) as { name?: unknown; arguments?: unknown; parameters?: unknown };
    const known = ADVISOR_TOOLS.some((t) => t.function.name === parsed.name);
    if (!known) return [];
    const args = (parsed.arguments ?? parsed.parameters ?? {}) as Record<string, unknown>;
    return [{ function: { name: String(parsed.name), arguments: args } }];
  } catch {
    return [];
  }
}

/**
 * What the server says when a draft is not grounded. Sent in place of the
 * draft (which is thrown away, so the model does not build on it).
 */
const SEARCH_FIRST =
  'Note from the D4Drive server: you have not searched the fleet yet, so you cannot name any car or price. Call search_fleet now with the filters that match my request, then answer only from its results.';
const PRICES_FROM_ROWS = (bad: number[]) =>
  `Note from the D4Drive server: these amounts are not in the tool results: ${bad.map((n) => `₹${n}`).join(', ')}. Answer again using only the rupees_per_day and rental_rupees values the tools returned.`;

/** Delivery fees may always be quoted: they are the site's own constants. */
const FEES = new Set<number>(DELIVERY_TIERS.map((t) => t.fee));

export async function askAdvisor(history: AdvisorTurn[], now = new Date()): Promise<AdvisorReply> {
  const today = todayLine(now);
  const messages: OllamaMessage[] = [
    { role: 'system', content: `${ADVISOR_SYSTEM}\n\n${today.text}` },
    ...history.map((turn): OllamaMessage => ({ role: turn.role, content: turn.content })),
  ];
  const seen = new Map<number, AdvisorCar>();
  const known = new Set<number>(FEES);
  let searched = false;
  let corrections = 0;

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const message = await chat(messages);
    const calls = message.tool_calls?.length ? message.tool_calls : toolCallInText(message.content);

    if (calls.length === 0) {
      const reply = cleanReply(message.content) || EMPTY;

      // A small model will answer from imagination if it can. A draft that
      // names prices or cars before any search, or quotes a price no tool
      // returned, is sent back with a correction instead of to the visitor.
      const bad = ungroundedAmounts(reply, known);
      const unsearched = !searched && soundsFactual(reply);
      if ((unsearched || bad.length > 0) && corrections < MAX_CORRECTIONS) {
        corrections += 1;
        console.warn('[advisor] ungrounded draft:', unsearched ? 'no search yet' : `amounts ${bad.join(', ')}`);
        messages.push({ role: 'user', content: unsearched ? SEARCH_FIRST : PRICES_FROM_ROWS(bad) });
        continue;
      }
      if (unsearched || bad.length > 0) return { reply: UNSURE, cars: [] };
      return { reply, cars: mentionedCars(reply, seen.values()) };
    }

    // The model's turn goes back as it came, then one tool message per call.
    messages.push({ role: 'assistant', content: message.content, tool_calls: calls });
    for (const call of calls) {
      const outcome = await runTool(call.function.name, parseArgs(call.function.arguments), seen, today.iso);
      if ('output' in outcome) {
        searched = true;
        numbersIn(outcome.output, known);
      }
      messages.push({ role: 'tool', tool_name: call.function.name, content: JSON.stringify(outcome) });
    }
  }

  return { reply: TOO_LONG, cars: [] };
}
