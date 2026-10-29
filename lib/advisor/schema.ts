import { z } from 'zod';

/**
 * The car advisor's boundaries: what the browser may send, and what the
 * model (run locally by Ollama) may ask the tools for.
 *
 * Both are untrusted. The conversation comes from the visitor; a tool's
 * arguments come from the model. Each is parsed with zod before anything
 * reaches a query, the same as every other route (lib/validation/schemas.ts).
 *
 * Pure: no database, no SDK client, so tests/advisor.test.ts loads it as is.
 */

// ---------------------------------------------------------------------------
// The conversation the widget sends

export const MAX_TURNS = 16;
export const MAX_USER_CHARS = 600;
const MAX_ASSISTANT_CHARS = 2400;

const turn = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1),
});

/**
 * The visitor's side of the chat, text only. The server rebuilds the
 * request to the model from it on every turn, so nothing but plain text
 * crosses from the browser: no tool results, no system text, no images.
 */
export const advisorRequestSchema = z
  .object({ messages: z.array(turn).min(1).max(MAX_TURNS) })
  .superRefine(({ messages }, ctx) => {
    messages.forEach((m, i) => {
      if (m.role !== (i % 2 === 0 ? 'user' : 'assistant')) {
        ctx.addIssue({ code: 'custom', path: ['messages', i], message: 'Turns must alternate, starting with yours.' });
      }
      const max = m.role === 'user' ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS;
      if (m.content.length > max) {
        ctx.addIssue({ code: 'custom', path: ['messages', i], message: `Keep a message under ${max} characters.` });
      }
    });
    if (messages[messages.length - 1]?.role !== 'user') {
      ctx.addIssue({ code: 'custom', path: ['messages'], message: 'The last message must be yours.' });
    }
  });

export type AdvisorTurn = z.infer<typeof advisorRequestSchema>['messages'][number];

/** A car the advisor recommends, as the widget shows it. Every field is from MySQL. */
export interface AdvisorCar {
  id: number;
  brand: string;
  model: string;
  pricePerDay: number;
  seats: number;
  fuel: string;
  transmission: string;
  branch: string;
  image: string | null;
}

export interface AdvisorReply {
  reply: string;
  cars: AdvisorCar[];
}

/**
 * What /api/advisor streams back, one JSON object per line. `draft` is the
 * checked reply so far (the whole of it, not a delta; an empty one means a
 * draft was withdrawn for a correction), `done` the final reply and its cars.
 */
export type AdvisorEvent =
  | { type: 'draft'; text: string }
  | ({ type: 'done' } & AdvisorReply)
  | { type: 'error'; status: number; error: string };

// ---------------------------------------------------------------------------
// The tools the model can call

const FUELS = ['petrol', 'diesel', 'electric', 'hybrid'] as const;
const TRANSMISSIONS = ['manual', 'automatic'] as const;
const SORTS = ['price_asc', 'price_desc', 'seats_desc'] as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Not a real date');

/**
 * A small model fills a filter nobody asked for with "all" or "any" (a live
 * run searched for brand "all" and found nothing). That means no filter.
 */
const NO_PREFERENCE = /^(all|any|none|either|no preference|not specified|n\/a)$/i;

/** A filter the visitor did not mention is left out, sent as null or as "all"; each becomes null. */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .preprocess((v) => (typeof v === 'string' && NO_PREFERENCE.test(v.trim()) ? null : v), schema.nullish())
    .transform((v) => v ?? null);

export const searchFleetInput = z
  .object({
    seats_min: optional(z.number().int().min(2).max(9)),
    fuel: optional(z.enum(FUELS)),
    transmission: optional(z.enum(TRANSMISSIONS)),
    max_price_per_day: optional(z.number().positive().max(1_000_000)),
    brand: optional(z.string().trim().min(1).max(60)),
    sort: optional(z.enum(SORTS)).transform((v) => v ?? 'price_asc'),
  })
  .strict();

/** The car by its id from search_fleet, or by name (the conversation keeps names, not ids). */
export const checkAvailabilityInput = z
  .object({
    car_id: optional(z.number().int().positive()),
    car_name: optional(z.string().trim().min(2).max(80)),
    start_date: isoDate,
    end_date: isoDate,
  })
  .strict();

export type SearchFleetInput = z.output<typeof searchFleetInput>;
export type CheckAvailabilityInput = z.output<typeof checkAvailabilityInput>;

/** A tool as Ollama's /api/chat takes it: a function with a JSON Schema for its arguments. */
export interface AdvisorTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

/**
 * The same two shapes as JSON Schema, for the model. A small local model
 * follows them most of the time, not always, so zod checks every call on
 * arrival: a schema the model is asked to follow is not one the server
 * has to trust.
 */
export const ADVISOR_TOOLS: AdvisorTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_fleet',
      description:
        'Search the live D4Drive fleet in MySQL. Returns every active car that matches, with its id, brand, model, year, seats, fuel, gearbox, daily rate in rupees, home branch and description. Leave out any filter the visitor has not asked for. Call it with no filters to see the whole fleet (it is small).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          seats_min: { type: 'integer', description: 'At least this many seats (2 to 9).' },
          fuel: { type: 'string', enum: [...FUELS] },
          transmission: { type: 'string', enum: [...TRANSMISSIONS] },
          max_price_per_day: { type: 'number', description: 'Highest daily rate in rupees.' },
          brand: { type: 'string', description: 'Exact brand, for example Maruti Suzuki or Tata.' },
          sort: { type: 'string', enum: [...SORTS], description: 'Order of the results. Default price_asc.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description:
        'Check whether one car is free for a date range, using the same database function the booking uses, and price the rental. Name the car by car_id (from search_fleet) or by car_name (for example Honda City ZX). Dates are YYYY-MM-DD; the return date is after the pickup date and the pickup is today or later. The price excludes any delivery fee.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['start_date', 'end_date'],
        properties: {
          car_id: { type: 'integer', description: 'The id from search_fleet, if you have it.' },
          car_name: { type: 'string', description: 'Or the car by name, for example Honda City ZX.' },
          start_date: { type: 'string', description: 'Pickup day, YYYY-MM-DD.' },
          end_date: { type: 'string', description: 'Return day, YYYY-MM-DD.' },
        },
      },
    },
  },
];
