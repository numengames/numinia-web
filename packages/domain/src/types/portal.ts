/**
 * Portals — spatial navigation into the districts' virtual worlds
 * (14 portals across the 4 districts in the legacy map, ADR-010).
 */

import type { LocalizedString } from './i18n.js';
import type { DistrictId } from './district.js';

/** Position on the interactive world map, percent coordinates (0–100). */
export interface PortalMapPosition {
  readonly x: number;
  readonly y: number;
}

export interface Portal {
  readonly id: string;
  readonly districtId: DistrictId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  /** External world URL (oncyber/Hyperfy). Absent while a space is unbuilt. */
  readonly worldUrl?: string;
  readonly mapPosition: PortalMapPosition;
}

/** The Plaza del Ágora — the central hub. It belongs to no district: every
    district measures its coordinates FROM it (see DistrictCoordinates). */
export interface PortalHub {
  readonly id: string;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  readonly worldUrl: string;
  readonly mapPosition: PortalMapPosition;
}
