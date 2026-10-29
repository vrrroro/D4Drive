import { DELIVERY_TIERS } from '@/lib/constants';
import { systemMessage, todayLine } from '@/lib/advisor/prompt';
import {
  asksBack,
  cleanReply,
  completeSentences,
  givesPartySize,
  mentionedCars,
  numbersIn,
  soundsFactual,
  ungroundedAmounts,
  unknownCars,
} from '@/lib/advisor/reply';
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
 * The answer is streamed: once the fleet has been searched, each finished
 * sentence is checked and handed to `onDraft`, so the visitor reads it while
 * the model is still writing the next one. Nothing unchecked is ever passed
 * on; a sentence that fails a check stops the draft, withdraws what was
 * shown, and sends the model back with a correction.
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

/**
 * How long Ollama keeps the model in memory after the last message. Loading
 * it again and re-reading the instructions costs about 17 s on a laptop
 * CPU, so it stays for a day (about 2 GB of RAM while it does).
 */
const KEEP_ALIVE = '24h';

/**
 * The same for every request, warm-up included: a different num_ctx makes
 * Ollama reload the model. num_predict caps a runaway reply (an 80 word
 * answer is about 120 tokens).
 */
const OPTIONS = { temperature: 0.2, num_ctx: 8192, num_predict: 320 };

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

/** One line of Ollama's streamed answer. A tool call arrives whole, in one line. */
interface OllamaChunk {
  message?: { content?: string; tool_calls?: OllamaToolCall[] };
  done?: boolean;
  error?: string;
}

function requestBody(messages: OllamaMessage[], options: Record<string, number> = OPTIONS) {
  return JSON.stringify({ model: ADVISOR_MODEL, messages, tools: ADVISOR_TOOLS, stream: true, keep_alive: KEEP_ALIVE, options });
}

/** A failed fetch or read, as the route should report it. */
function failure(error: unknown, cancelled: AbortSignal | undefined): Error {
  // The visitor went away: not the model's fault, nothing to report.
  if (cancelled?.aborted) return error instanceof Error ? error : new Error('cancelled');
  if (error instanceof AdvisorBusyError || error instanceof AdvisorUnavailableError) return error;
  // A garbled line from Ollama: it is running, just not well.
  if (error instanceof SyntaxError) return new AdvisorBusyError();
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    console.warn('[advisor] the model took longer than', ROUND_TIMEOUT_MS, 'ms');
    return new AdvisorBusyError();
  }
  // Connection refused: Ollama is not running on OLLAMA_HOST.
  console.error('[advisor] could not reach Ollama at', OLLAMA_HOST);
  return new AdvisorUnavailableError();
}

/**
 * One round with the model, streamed. `onContent` sees the text so far
 * after every token and returns false to stop the model there (the round
 * then comes back with `stopped`).
 */
async function chat(
  messages: OllamaMessage[],
  cancelled: AbortSignal | undefined,
  onContent: (soFar: string) => boolean,
): Promise<{ message: OllamaMessage; stopped: boolean }> {
  const stop = new AbortController();
  const signals = [AbortSignal.timeout(ROUND_TIMEOUT_MS), stop.signal, ...(cancelled ? [cancelled] : [])];
  let response: Response;
  try {
    response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody(messages),
      signal: AbortSignal.any(signals),
    });
  } catch (error) {
    throw failure(error, cancelled);
  }

  if (response.status === 404) {
    console.error(`[advisor] model ${ADVISOR_MODEL} is not pulled: run "ollama pull ${ADVISOR_MODEL}"`);
    throw new AdvisorUnavailableError();
  }
  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => ({}))) as OllamaChunk;
    console.warn('[advisor] Ollama answered', response.status, body.error ?? '');
    throw new AdvisorBusyError();
  }

  let content = '';
  const toolCalls: OllamaToolCall[] = [];
  let stopped = false;
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffered = '';
  try {
    reading: for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffered += value;
      let newline: number;
      while ((newline = buffered.indexOf('\n')) >= 0) {
        const line = buffered.slice(0, newline).trim();
        buffered = buffered.slice(newline + 1);
        if (!line) continue;
        const chunk = JSON.parse(line) as OllamaChunk;
        if (chunk.error) {
          console.warn('[advisor] Ollama stopped:', chunk.error);
          throw new AdvisorBusyError();
        }
        if (chunk.message?.tool_calls?.length) toolCalls.push(...chunk.message.tool_calls);
        if (chunk.message?.content) {
          content += chunk.message.content;
          if (!onContent(content)) {
            stopped = true;
            break reading;
          }
        }
        if (chunk.done) break reading;
      }
    }
  } catch (error) {
    throw failure(error, cancelled);
  } finally {
    // Stops Ollama generating if we left early (a failed check, or the visitor went away).
    stop.abort();
    reader.releaseLock();
  }
  return { message: { role: 'assistant', content, tool_calls: toolCalls.length ? toolCalls : undefined }, stopped };
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
const SEARCH_NOW =
  'Note from the D4Drive server: I have already said how many of us are coming, so do not ask. Call search_fleet now (the number of people is seats_min) and recommend from its results.';
const PRICES_FROM_ROWS = (bad: number[]) =>
  `Note from the D4Drive server: these amounts are not in the tool results: ${bad.map((n) => `₹${n}`).join(', ')}. Answer again using only the rupees_per_day and rental_rupees values the tools returned.`;
const NOT_IN_FLEET = (names: string[]) =>
  `Note from the D4Drive server: ${names.join(', ')} did not come from search_fleet, so ${names.length > 1 ? 'they are' : 'it is'} not in our fleet. Answer again recommending only cars the tools returned.`;

/** Delivery fees may always be quoted: they are the site's own constants. */
const FEES = new Set<number>(DELIVERY_TIERS.map((t) => t.fee));

export interface AdvisorOptions {
  now?: Date;
  /** Aborted when the visitor leaves: the model is stopped, sparing the CPU. */
  signal?: AbortSignal;
  /** The checked reply so far, each time it grows by a sentence; '' when a draft is withdrawn. */
  onDraft?: (text: string) => void;
}

export async function askAdvisor(history: AdvisorTurn[], { now = new Date(), signal, onDraft }: AdvisorOptions = {}): Promise<AdvisorReply> {
  const today = todayLine(now);
  const messages: OllamaMessage[] = [
    { role: 'system', content: systemMessage(now) },
    ...history.map((turn): OllamaMessage => ({ role: turn.role, content: turn.content })),
  ];
  const seen = new Map<number, AdvisorCar>();
  const known = new Set<number>(FEES);
  let searched = false;
  let corrections = 0;
  const partyGiven = givesPartySize(history[history.length - 1]?.content ?? '');

  /** Why a draft cannot be shown, as the correction to send back; null when it can. */
  const fault = (reply: string): string | null => {
    const strangers = unknownCars(reply, seen.values());
    if (!searched && (soundsFactual(reply) || strangers.length > 0)) return SEARCH_FIRST;
    if (!searched && partyGiven && asksBack(reply)) return SEARCH_NOW;
    const bad = ungroundedAmounts(reply, known);
    if (bad.length > 0) return PRICES_FROM_ROWS(bad);
    if (strangers.length > 0) return NOT_IN_FLEET(strangers);
    return null;
  };

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    // What this round has shown the visitor, and why it was stopped, if it was.
    const draft = { shown: '', stoppedFor: null as string | null };

    const { message, stopped } = await chat(messages, signal, (soFar) => {
      // Before a search an answer is usually a guess, and text that opens
      // like JSON is a tool call typed out: hold both until the end.
      if (!searched || !onDraft || /^\s*[{`]/.test(soFar)) return true;
      const text = cleanReply(completeSentences(soFar));
      if (text.length <= draft.shown.length) return true;
      draft.stoppedFor = fault(text);
      if (draft.stoppedFor) return false;
      draft.shown = text;
      onDraft(text);
      return true;
    });
    const withdraw = () => {
      if (draft.shown) onDraft?.('');
    };

    const calls = message.tool_calls?.length ? message.tool_calls : stopped ? [] : toolCallInText(message.content);

    if (calls.length === 0) {
      const reply = cleanReply(message.content) || EMPTY;

      // A small model will answer from imagination if it can. A draft that
      // names cars or prices before any search, names a car no tool
      // returned, or quotes a price no tool returned, is sent back with a
      // correction instead of to the visitor.
      const correction = draft.stoppedFor ?? fault(reply);
      if (correction && corrections < MAX_CORRECTIONS) {
        corrections += 1;
        withdraw();
        console.warn('[advisor] ungrounded draft:', correction.replace(/^Note from the D4Drive server: /, '').slice(0, 90));
        messages.push({ role: 'user', content: correction });
        continue;
      }
      if (correction) {
        withdraw();
        return { reply: UNSURE, cars: [] };
      }
      return { reply, cars: mentionedCars(reply, seen.values()) };
    }

    // Text before a tool call ("Let me check...") is not the answer.
    withdraw();
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

/**
 * Loads the model and has it read the instructions once, at server start
 * (instrumentation.ts), so the first visitor does not wait for either.
 * Ollama then keeps both for KEEP_ALIVE. Never throws: without Ollama the
 * site runs and the advisor says it is off.
 */
export async function warmAdvisor(): Promise<void> {
  const started = Date.now();
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The same system message, tools and options a visitor's request
      // starts with, so Ollama can reuse what it read; one token of answer.
      body: requestBody(
        [
          { role: 'system', content: systemMessage() },
          { role: 'user', content: 'Hello' },
        ],
        { ...OPTIONS, num_predict: 1 },
      ),
      signal: AbortSignal.timeout(ROUND_TIMEOUT_MS),
    });
    await response.text();
    if (!response.ok) {
      console.warn(`[advisor] warm-up: Ollama answered ${response.status} (is ${ADVISOR_MODEL} pulled?)`);
      return;
    }
    console.info(`[advisor] ${ADVISOR_MODEL} loaded and ready in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  } catch {
    console.info(`[advisor] warm-up skipped: Ollama is not reachable at ${OLLAMA_HOST}`);
  }
}
