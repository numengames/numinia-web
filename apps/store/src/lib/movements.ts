/**
 * The Bazar's seventh section, «Movimientos» (first cut): the movements an
 * avatar can already make with a CC0 animation that exists today, each with
 * the stable id of the movements dictionary (work/movimientos/DICCIONARIO.md:
 * a group prefix plus the number the movement has in the list, which never
 * changes). Only the movements COBERTURA.md marks «covered in full» are
 * here; the half-covered, the unchecked and the ones still to be recorded
 * join when they have a clip. No download yet: the section lists, it does
 * not hand out files.
 *
 * Client-safe and pure: plain data, no catalogue reads.
 */

/** The CC0 libraries the clips come from. */
export type MovementLibrary = 'quaternius-ual' | 'makehuman';

export interface Movement {
  /** The dictionary's stable id («GS-03»): it never changes between editions. */
  readonly id: string;
  readonly library: MovementLibrary;
  /** The clips (or poses) in the library that make the movement, by their own names. */
  readonly clips: readonly string[];
}

/** The movements covered in full by a CC0 clip, in the dictionary's order. */
export const MOVEMENTS: readonly Movement[] = [
  { id: 'GS-03', library: 'quaternius-ual', clips: ['Celebration'] },
  {
    id: 'EST-13',
    library: 'quaternius-ual',
    clips: ['Idle_Loop', 'Idle_LookAround_Loop', 'Idle_Tired_Loop'],
  },
  {
    id: 'EST-15',
    library: 'quaternius-ual',
    clips: ['Sitting_Enter', 'Sitting_Idle_Loop', 'Sitting_Exit'],
  },
  {
    id: 'EST-16',
    library: 'quaternius-ual',
    clips: ['GroundSit_Enter', 'GroundSit_Idle_Loop', 'GroundSit_Exit'],
  },
  { id: 'EST-19', library: 'quaternius-ual', clips: ['Idle_FoldArms_Loop'] },
  { id: 'REA-23', library: 'quaternius-ual', clips: ['Surprise'] },
  { id: 'REA-24', library: 'quaternius-ual', clips: ['Crying'] },
  { id: 'MUN-32', library: 'quaternius-ual', clips: ['Interact'] },
  { id: 'MUN-34', library: 'quaternius-ual', clips: ['Chest_Open', 'Interact'] },
  { id: 'MUN-35', library: 'quaternius-ual', clips: ['Push_Enter', 'Push_Loop', 'Push_Exit'] },
  { id: 'MUN-36', library: 'quaternius-ual', clips: ['OverhandThrow'] },
  { id: 'MUN-37', library: 'quaternius-ual', clips: ['PickUp_Kneeling', 'PickUp_Table'] },
  {
    id: 'DUO-42',
    library: 'makehuman',
    clips: ['Posing 1–6', 'Peace And Love', 'Arms Akimbo'],
  },
];

/** Every movement here is CC0: the section takes nothing else. */
export const MOVEMENTS_LICENSE = 'CC0-1.0';

/** The dictionary's id shape: a group prefix, a dash, the list number in two digits. */
export const MOVEMENT_ID = /^(GS|EST|REA|MUN|DUO)-\d{2}$/;

/** The library's name as people know it (a proper name: the same in every language). */
export function libraryName(library: MovementLibrary): string {
  return library === 'quaternius-ual' ? 'Quaternius · Universal Animation Library' : 'MakeHuman';
}
