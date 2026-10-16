/**
 * «El menú de la cara» (cut 9): what the account menu of the top bar shows
 * beyond the rank — the name the person published, their balance and the
 * organizations they belong to. Read once, when the menu is first opened
 * (never on page load: the front door asks the till nothing).
 *
 * Imported only by the chrome's script, so the bundler inlines it into the
 * page: pure, no zod, no import — whatever comes from outside is read by
 * hand, and anything odd reads as «nothing to show» (a link without the
 * figure, the generic door to the panels), never as a broken menu.
 *
 * There is no presence: no status, no «Pon una frase de estado».
 */

/** What the menu adds to the static markup. */
export interface FaceMenu {
  /** The name the person published, or null (the short wallet stays). */
  readonly name: string | null;
  /** The Bazar avatar's baked face the person published (`/thumbs/1x/<id>.webp`), or null. */
  readonly face: string | null;
  /** The personal account's balance in euro cents, or null when it cannot be read. */
  readonly balanceCents: number | null;
  /** The organizations the person belongs to (the house's own entries left out). */
  readonly panels: readonly { readonly id: string; readonly name: string }[];
}

/** What a menu reads when the till answers nothing. */
export const EMPTY_FACE: FaceMenu = { name: null, face: null, balanceCents: null, panels: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** An account id as the panel's address takes it (lib/panel.ts ORG_SHAPE). */
const ID_SHAPE = /^[A-Za-z0-9_-]{1,64}$/;

/** GET /api/saldo's body: the personal balance and the teams the wallet is in. */
function readAccounts(body: unknown): Pick<FaceMenu, 'balanceCents' | 'panels'> {
  const accounts = isRecord(body) && Array.isArray(body['accounts']) ? body['accounts'] : [];
  let balanceCents: number | null = null;
  const panels: { id: string; name: string }[] = [];
  for (const entry of accounts as unknown[]) {
    if (!isRecord(entry)) continue;
    const { id, kind, name, balanceCents: cents, as } = entry;
    if (kind === 'personal' && typeof cents === 'number' && Number.isFinite(cents)) {
      balanceCents = cents;
    }
    if (kind === 'team' && as !== 'house' && typeof id === 'string' && ID_SHAPE.test(id)) {
      panels.push({ id, name: typeof name === 'string' && name !== '' ? name : id });
    }
  }
  return { balanceCents, panels };
}

/** GET /api/profile's body: the name published, if any. */
function readName(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body['profile'])) return null;
  const { name } = body['profile'];
  return typeof name === 'string' && name.trim() !== '' ? name.trim() : null;
}

/** Only a baked thumbnail of this site is ever drawn as a face (lib/thumbs.ts faceSrc). */
const FACE_SHAPE = /^\/thumbs\/1x\/[A-Za-z0-9_.-]{1,128}\.webp$/;

/** GET /api/profile's body: the face published, if any and if it is one of ours. */
function readFaceSrc(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body['profile'])) return null;
  const { face } = body['profile'];
  return typeof face === 'string' && FACE_SHAPE.test(face) ? face : null;
}

/** The two answers, read by hand; an answer that is not one reads as absent. */
export function readFace(saldo: unknown, profile: unknown): FaceMenu {
  return { name: readName(profile), face: readFaceSrc(profile), ...readAccounts(saldo) };
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** One JSON body, or null for any status but 200 or any failure. */
async function bodyOf(fetcher: Fetch, path: string): Promise<unknown> {
  try {
    const response = await fetcher(path, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    const text = await response.text();
    return response.ok ? (JSON.parse(text) as unknown) : null;
  } catch {
    return null;
  }
}

/** Both reads at once; never throws. */
export async function loadFace(fetcher: Fetch): Promise<FaceMenu> {
  const [saldo, profile] = await Promise.all([
    bodyOf(fetcher, '/api/saldo'),
    bodyOf(fetcher, '/api/profile'),
  ]);
  return readFace(saldo, profile);
}

/** A balance as the visitor's language writes euros («18,40 €»). */
export function formatBalance(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** An organization's panel under the visitor's locale: `<panel door>?org=<id>`. */
export function panelLink(door: string, id: string): string {
  return `${door}?org=${encodeURIComponent(id)}`;
}
