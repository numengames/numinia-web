/**
 * An AI's presence in a world, read as untrusted («La IA dentro del mundo»,
 * story S17): the settings the till keeps (`presence_json`), a change to
 * them, where the AI lives, and the `ia` block of the world pass built from
 * them. Pure — no clock, no storage. The limits are the engine's own
 * (numinia-engine `pase.ts`, `ia`): what passes here the engine accepts, so
 * the store copies the block into the pass untouched.
 *
 * A malformed value is a list of problems in words, never a throw.
 */

import { z } from 'zod';
import {
  AGENT_BODY_KINDS,
  AGENT_BODY_MODEL_MAX,
  AGENT_HEARING_STEPS,
  AGENT_RESPONDS_TEXT_MAX,
  AGENT_STAY_HOURS,
  AGENT_WORLDS_MAX,
  BUBBLE_RADIUS_MAX,
  BUBBLE_RADIUS_MIN,
  BUBBLE_SHAPES,
  BUBBLE_VISIBLE,
  CALL_PHRASE_MAX,
  type AgentPassIa,
  type AgentPresence,
  type AgentPresenceChange,
  type AgentPresenceRead,
  type AgentResponds,
  type AgentWorlds,
} from '../types/agent-presence.js';

/** A new AI’s presence, and the one an AI with nothing stored has: the house's robot, a 4 m sphere seen when near, named, `/name` and button on, from inside only, no phrase, leaves after 10 min, hears only who calls it. */
export const DEFAULT_AGENT_PRESENCE: AgentPresence = {
  cuerpo: { tipo: 'casa', modelo: 0 },
  burbuja: { forma: 'esfera', radio: 4, visible: 'al-acercarte' },
  llamada: { nombre: true, barra: true, boton: true, solo_dentro: true },
  oye: 'llamada',
  quedarse_h: 0,
};

// eslint-disable-next-line no-control-regex -- a phrase and a name never hold a control character
const CONTROL = /[\u0000-\u001f\u007f]/;
const WALLET = /^0x[0-9a-f]{40}$/;
const WORLD_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** The longest a world id is (the till's CHECK). */
const WORLD_ID_MAX = 63;

/** Text of 1 to `max` characters, trimmed, none of them a control character. */
const text = (max: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, 'must not be blank')
        .max(max, `must be at most ${max} characters`)
        .refine((value) => !CONTROL.test(value), 'must not hold a control character'),
    );

const stayHours = z.literal([...AGENT_STAY_HOURS], {
  error: `must be one of ${AGENT_STAY_HOURS.join(', ')}`,
});

const bodySchema = z.strictObject({
  tipo: z.enum(AGENT_BODY_KINDS),
  modelo: z.int().min(0).max(AGENT_BODY_MODEL_MAX),
});

const bubbleSchema = z.strictObject({
  forma: z.enum(BUBBLE_SHAPES),
  radio: z.int().min(BUBBLE_RADIUS_MIN).max(BUBBLE_RADIUS_MAX),
  visible: z.enum(BUBBLE_VISIBLE),
});

const callingFields = {
  nombre: z.boolean(),
  barra: z.boolean(),
  boton: z.boolean(),
  solo_dentro: z.boolean(),
};

const callingSchema = z.strictObject({ ...callingFields, frase: text(CALL_PHRASE_MAX).optional() });

const presenceSchema = z.strictObject({
  cuerpo: bodySchema,
  burbuja: bubbleSchema,
  llamada: callingSchema,
  oye: z.enum(AGENT_HEARING_STEPS),
  quedarse_h: stayHours,
});

const changeSchema = z
  .strictObject({
    cuerpo: bodySchema.partial(),
    burbuja: bubbleSchema.partial(),
    llamada: z
      .strictObject({ ...callingFields, frase: text(CALL_PHRASE_MAX).nullable() })
      .partial(),
    oye: z.enum(AGENT_HEARING_STEPS),
    quedarse_h: stayHours,
  })
  .partial()
  .refine((change) => Object.keys(change).length > 0, 'must change something');

const respondsSchema = z.strictObject({
  comunidad: text(AGENT_RESPONDS_TEXT_MAX),
  nombre: text(AGENT_RESPONDS_TEXT_MAX).optional(),
  cartera: z.string().regex(WALLET, 'must be 0x and 40 lower case hexadecimal digits').optional(),
});

const passIaSchema = z.strictObject({
  cuerpo: bodySchema.optional(),
  burbuja: bubbleSchema.optional(),
  llamada: callingSchema.optional(),
  responde: respondsSchema,
  quedarse_h: stayHours.optional(),
});

const worldId = z
  .string()
  .max(WORLD_ID_MAX, `must be at most ${WORLD_ID_MAX} characters`)
  .regex(WORLD_ID, 'must be lower case letters, digits and single hyphens');

const worldsSchema = z.union([
  z.strictObject({ todos: z.literal(true) }),
  z.strictObject({
    mundos: z
      .array(worldId)
      .min(1, 'must name at least one world')
      .max(AGENT_WORLDS_MAX, `must name at most ${AGENT_WORLDS_MAX} worlds`)
      .refine((ids) => new Set(ids).size === ids.length, 'must not repeat a world'),
  }),
]);

/** The problems of a failed read, one line each: `path: message`, the path omitted at the root. */
function problemsOf(error: z.ZodError): string[] {
  const lines = error.issues.map((issue) => {
    const path = issue.path.map(String).join('.');
    return path === '' ? issue.message : `${path}: ${issue.message}`;
  });
  return [...new Set(lines)];
}

/** The schemas are strict and `T` is their output type; `exactOptionalPropertyTypes` makes zod's own inference differ by `| undefined`. */
function read<T>(schema: z.ZodType, value: unknown): AgentPresenceRead<T> {
  const parsed = schema.safeParse(value);
  return parsed.success
    ? { ok: true, value: parsed.data as T }
    : { ok: false, problems: problemsOf(parsed.error) };
}

/** A whole presence — all four groups and the rest, none unknown. */
export function parseAgentPresence(value: unknown): AgentPresenceRead<AgentPresence> {
  return read<AgentPresence>(presenceSchema, value);
}

/** A change to the presence: at least one field, each valid, none unknown. */
export function parseAgentPresenceChange(value: unknown): AgentPresenceRead<AgentPresenceChange> {
  return read<AgentPresenceChange>(changeSchema, value);
}

/** The `responde` block of the pass: community, and the person's name or wallet. */
export function parseAgentResponds(value: unknown): AgentPresenceRead<AgentResponds> {
  return read<AgentResponds>(respondsSchema, value);
}

/** The `ia` block of the pass as the engine accepts it. */
export function parseAgentPassIa(value: unknown): AgentPresenceRead<AgentPassIa> {
  return read<AgentPassIa>(passIaSchema, value);
}

/** Where the AI lives: `{ todos: true }` or `{ mundos: [1 to 50 distinct world ids] }`. */
export function parseAgentWorlds(value: unknown): AgentPresenceRead<AgentWorlds> {
  return read<AgentWorlds>(worldsSchema, value);
}

/** The presence with `change` applied: only what the change names moves; `frase: null` drops the phrase. */
export function applyAgentPresenceChange(
  current: AgentPresence,
  change: AgentPresenceChange,
): AgentPresence {
  const { frase, ...rest } = { ...current.llamada, ...change.llamada };
  return {
    cuerpo: { ...current.cuerpo, ...change.cuerpo },
    burbuja: { ...current.burbuja, ...change.burbuja },
    llamada: typeof frase === 'string' ? { ...rest, frase } : rest,
    oye: change.oye ?? current.oye,
    quedarse_h: change.quedarse_h ?? current.quedarse_h,
  };
}

/**
 * The presence of an AI from what the till stored: the JSON text, or null
 * for an AI nobody has set up. Anything that no longer passes the schema
 * (a row from a later or earlier shape) is the default, never a throw.
 */
export function agentPresenceOf(stored: string | null): AgentPresence {
  if (stored === null) return DEFAULT_AGENT_PRESENCE;
  try {
    const parsed = parseAgentPresence(JSON.parse(stored));
    return parsed.ok ? parsed.value : DEFAULT_AGENT_PRESENCE;
  } catch {
    return DEFAULT_AGENT_PRESENCE;
  }
}

/** What the till writes for a presence: its canonical JSON, or null when it is the default. */
export function storedAgentPresence(presence: AgentPresence): string | null {
  const canonical = (one: AgentPresence): string =>
    JSON.stringify({
      cuerpo: { tipo: one.cuerpo.tipo, modelo: one.cuerpo.modelo },
      burbuja: { forma: one.burbuja.forma, radio: one.burbuja.radio, visible: one.burbuja.visible },
      llamada: {
        nombre: one.llamada.nombre,
        barra: one.llamada.barra,
        boton: one.llamada.boton,
        solo_dentro: one.llamada.solo_dentro,
        ...(one.llamada.frase === undefined ? {} : { frase: one.llamada.frase }),
      },
      oye: one.oye,
      quedarse_h: one.quedarse_h,
    });
  const json = canonical(presence);
  return json === canonical(DEFAULT_AGENT_PRESENCE) ? null : json;
}

/**
 * The `ia` block of the world pass for an AI: its body, bubble, how it is
 * called and its stay, written out whole, and who answers for it. What the
 * pass does not carry (`oye`) stays behind.
 */
export function agentPassIa(presence: AgentPresence, responde: AgentResponds): AgentPassIa {
  return {
    cuerpo: presence.cuerpo,
    burbuja: presence.burbuja,
    llamada: presence.llamada,
    responde,
    quedarse_h: presence.quedarse_h,
  };
}
