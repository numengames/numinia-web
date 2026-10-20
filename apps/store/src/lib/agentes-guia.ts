/**
 * «Conectar una IA», the guide the panel's dialog tells a person who knows
 * nothing about it: the three ways, the questions people ask, then one screen
 * of numbered steps for the AI they use (Claude, ChatGPT, Hermes — on their
 * computer or in the cloud — or another one).
 *
 * Pure: no DOM, no fetch. The dialog (components/panel/AgentConnect.tsx) holds
 * the current {@link GuideView}; everything it decides about WHAT to draw — which
 * screen comes back from where, which steps an AI has, which extra (the
 * address and its «Copiar», the Hermes link, the code button…) goes under
 * which step, how a line with **bold** words is cut — is here, so it is tested
 * to the line. The words themselves are in i18n/agentes-guia.ts.
 */

/** The AIs a person may pick, in the order of the tiles. */
export const GUIDE_CLIENTS = ['claude', 'chatgpt', 'hermes', 'other'] as const;
export type GuideClient = (typeof GUIDE_CLIENTS)[number];

/** Hermes on the person's computer (the desktop app) or in the cloud (its web panel, or a terminal). */
export type HermesPlace = 'computer' | 'cloud';

/** Another AI: with a code from the panel (a token) or with its own key. */
export type OtherWay = 'code' | 'key';

/** The three ways, in the order of their cards. */
export const GUIDE_WAYS = ['address', 'code', 'key'] as const;
export type GuideWay = (typeof GUIDE_WAYS)[number];

/** Where the dialog is: the three ways, the tiles, or the steps of one AI. */
export type GuideView =
  | { readonly at: 'explain' }
  | { readonly at: 'choose' }
  | {
      readonly at: 'steps';
      readonly client: GuideClient;
      readonly place: HermesPlace;
      readonly way: OtherWay;
    };

export const EXPLAIN: GuideView = { at: 'explain' };
export const CHOOSE: GuideView = { at: 'choose' };

/** The steps of one AI (Hermes opens on its computer, another AI on the code). */
export function openClient(client: GuideClient, way: OtherWay = 'code'): GuideView {
  return { at: 'steps', client, place: 'computer', way };
}

/** The steps a way's own card leads to: the address one goes on to the tiles, the other two to «Otra». */
export function openWay(way: GuideWay): GuideView {
  if (way === 'address') return CHOOSE;
  return openClient('other', way === 'code' ? 'code' : 'key');
}

/** Hermes' tab: only a Hermes screen has one. */
export function withPlace(view: GuideView, place: HermesPlace): GuideView {
  return view.at === 'steps' && view.client === 'hermes' ? { ...view, place } : view;
}

/** Another AI's tab: only the «Otra» screen has one. */
export function withWay(view: GuideView, way: OtherWay): GuideView {
  return view.at === 'steps' && view.client === 'other' ? { ...view, way } : view;
}

/** The screen the back arrow goes to, or null on the first one. */
export function backOf(view: GuideView): GuideView | null {
  if (view.at === 'steps') return CHOOSE;
  if (view.at === 'choose') return EXPLAIN;
  return null;
}

/** Which list of steps a screen shows: one per AI, two for Hermes and for another AI. */
export type StepsKey =
  'claude' | 'chatgpt' | 'hermes-computer' | 'hermes-cloud' | 'other-code' | 'other-key';

export const STEPS_KEYS: readonly StepsKey[] = [
  'claude',
  'chatgpt',
  'hermes-computer',
  'hermes-cloud',
  'other-code',
  'other-key',
];

export function stepsKeyOf(view: Extract<GuideView, { at: 'steps' }>): StepsKey {
  if (view.client === 'hermes')
    return view.place === 'computer' ? 'hermes-computer' : 'hermes-cloud';
  if (view.client === 'other') return view.way === 'code' ? 'other-code' : 'other-key';
  return view.client;
}

/** Whether the AI signs in at numinia.com (and so the small picture of its «Permitir» screen goes beside the steps). */
export const signsIn = (key: StepsKey): boolean => !key.startsWith('other');

/**
 * What goes under a step besides its words:
 * - `address`: the relay's address and the one «Copiar»;
 * - `hermes-link`: Hermes desktop's «Añadir a Hermes» link;
 * - `create-code` / `create-key`: the button that opens the invitation, on the token or on the key;
 * - `token-command`: the Hermes line that asks for the code, with its copy;
 * - `terminal`: the two Hermes lines of the terminal, folded away.
 */
export type StepExtra =
  'address' | 'hermes-link' | 'create-code' | 'create-key' | 'token-command' | 'terminal';

/** Every list has three steps. */
export const STEP_COUNT = 3;

const EXTRAS: Readonly<Record<StepsKey, readonly (StepExtra | null)[]>> = {
  claude: ['address', null, null],
  chatgpt: ['address', null, null],
  'hermes-computer': ['hermes-link', null, null],
  'hermes-cloud': ['address', 'terminal', null],
  'other-code': ['create-code', 'address', 'token-command'],
  'other-key': ['create-key', null, null],
};

/** The extra under step `index` (0, 1, 2) of a list, or null. */
export function extraOf(key: StepsKey, index: number): StepExtra | null {
  return EXTRAS[key][index] ?? null;
}

/** The questions of the FAQ, in order, each with the house glyph beside it. */
export const FAQ_GLYPHS = [
  'robot',
  'lock-key',
  'coins',
  'prohibit',
  'moon',
  'ear',
  'link',
  'question',
  'users',
] as const;
export type FaqGlyph = (typeof FAQ_GLYPHS)[number];

/**
 * The two numbers the answers give, from the relay (apps/mcp/src): how many
 * bodies of one community may be inside worlds at once (`plazas.ts`
 * MAX_BODIES) and how long one may go unused before it leaves by itself
 * (`cuerpo.ts` IDLE_MS, in minutes). A test reads those two files and pins
 * these to them.
 */
export const BODIES_AT_ONCE = 3;
export const IDLE_MINUTES = 10;

/** A piece of a line of text: plain, or in **bold**. */
export interface Piece {
  readonly text: string;
  readonly bold: boolean;
}

/**
 * Cut a line on its `**bold**` marks: the words go in <strong> without any
 * HTML in the messages. An unpaired mark is plain text.
 */
export function pieces(line: string): readonly Piece[] {
  const parts = line.split('**');
  // An odd number of marks leaves the last one unpaired: it stays in the plain text before it.
  if (parts.length % 2 === 0) parts.push(parts.splice(-2).join('**'));
  return parts
    .map((text, index) => ({ text, bold: index % 2 === 1 }))
    .filter((piece) => piece.text !== '');
}
