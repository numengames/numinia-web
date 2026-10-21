/**
 * How an organization's AI is present in a world («La IA dentro del mundo»,
 * story S17): its body, the bubble of action around it, how people call it,
 * how long it stays when nobody uses it, and which worlds it lives in.
 *
 * The names are the engine's own — the `ia` block of the world pass the
 * engine accepts (numinia-engine `packages/server/src/pase.ts`, branch
 * `feat/ia-visible`) — so the store can copy them into the pass untouched:
 * `cuerpo`, `burbuja`, `llamada`, `responde`, `quedarse_h`. `oye` is the one
 * addition: the ladder of what the AI hears (D-083), which the pass does not
 * carry (the relay decides it), and which the till keeps with the rest.
 */

/** What the body is: today only one of the house's own models. */
export const AGENT_BODY_KINDS = ['casa'] as const;
export type AgentBodyKind = (typeof AGENT_BODY_KINDS)[number];

/** The house model numbers the engine accepts: 0 is the house's robot. */
export const AGENT_BODY_MODEL_MAX = 999;

/** The four shapes of the bubble (design §3, Appendix A). */
export const BUBBLE_SHAPES = ['esfera', 'cupula', 'cilindro', 'caja'] as const;
export type BubbleShape = (typeof BUBBLE_SHAPES)[number];

/** When the bubble is drawn: always, when you are within twice its radius, never. */
export const BUBBLE_VISIBLE = ['siempre', 'al-acercarte', 'nunca'] as const;
export type BubbleVisible = (typeof BUBBLE_VISIBLE)[number];

/** The bubble's radius in metres, whole: 2 to 12 (design §3). */
export const BUBBLE_RADIUS_MIN = 2;
export const BUBBLE_RADIUS_MAX = 12;

/** The key phrase's longest length; it must not be blank. */
export const CALL_PHRASE_MAX = 40;

/** Hours the AI stays in a world with nobody using it (D-082): 0 is «leave after 10 minutes». */
export const AGENT_STAY_HOURS = [0, 1, 4, 24] as const;
export type AgentStayHours = (typeof AGENT_STAY_HOURS)[number];

/**
 * What an AI hears (D-083, design §4): `llamada` only what is said to it
 * (name, /name, phrase, button), `burbuja` also what is said inside its
 * bubble, `todo` everything nearby (20 m) — the «hears» switch of old.
 */
export const AGENT_HEARING_STEPS = ['llamada', 'burbuja', 'todo'] as const;
export type AgentHearingStep = (typeof AGENT_HEARING_STEPS)[number];

/** Which worlds of its organization an AI lives in: all of them, or the ones chosen. */
export const AGENT_WORLDS_MODES = ['todos', 'elegidos'] as const;
export type AgentWorldsMode = (typeof AGENT_WORLDS_MODES)[number];

/** The most worlds one AI may be chosen into: the most the house places at once. */
export const AGENT_WORLDS_MAX = 50;

/** The longest `responde` text (community and name), as in the engine's pass. */
export const AGENT_RESPONDS_TEXT_MAX = 40;

export interface AgentBody {
  readonly tipo: AgentBodyKind;
  readonly modelo: number;
}

export interface AgentBubble {
  readonly forma: BubbleShape;
  readonly radio: number;
  readonly visible: BubbleVisible;
}

export interface AgentCalling {
  /** «Hermes, …» in the nearby chat. */
  readonly nombre: boolean;
  /** `/hermes …`. */
  readonly barra: boolean;
  /** The «Hablar con ella» button and the E key. */
  readonly boton: boolean;
  /** It can be called only from inside its bubble (otherwise up to 20 m). */
  readonly solo_dentro: boolean;
  /** A key phrase its owner makes up; absent when there is none. */
  readonly frase?: string;
}

/** An AI's presence settings, whole: what the till keeps (`presence_json`) once read. */
export interface AgentPresence {
  readonly cuerpo: AgentBody;
  readonly burbuja: AgentBubble;
  readonly llamada: AgentCalling;
  readonly oye: AgentHearingStep;
  readonly quedarse_h: AgentStayHours;
}

/** A change to the presence: any of the groups, any of their fields; `frase: null` clears the phrase. */
export interface AgentPresenceChange {
  readonly cuerpo?: Partial<AgentBody>;
  readonly burbuja?: Partial<AgentBubble>;
  readonly llamada?: Partial<Omit<AgentCalling, 'frase'>> & { readonly frase?: string | null };
  readonly oye?: AgentHearingStep;
  readonly quedarse_h?: AgentStayHours;
}

/** Who answers for the AI, as the pass shows it to everyone (D-084). */
export interface AgentResponds {
  readonly comunidad: string;
  /** The person's published name; absent when they have none. */
  readonly nombre?: string;
  /** Their wallet, `0x` and 40 hex digits, when they have no name; the world shows it abbreviated (`0x12…ab`, D-084). */
  readonly cartera?: string;
}

/** The `ia` block of the world pass, exactly as the engine accepts it. */
export interface AgentPassIa {
  readonly cuerpo?: AgentBody;
  readonly burbuja?: AgentBubble;
  readonly llamada?: AgentCalling;
  readonly responde: AgentResponds;
  readonly quedarse_h?: AgentStayHours;
}

/** Which worlds an AI lives in: all those of its organization, or exactly these. */
export type AgentWorlds = { readonly todos: true } | { readonly mundos: readonly string[] };

/** The result of reading something untrusted: the value, or the problems in words. */
export type AgentPresenceRead<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly problems: readonly string[] };
