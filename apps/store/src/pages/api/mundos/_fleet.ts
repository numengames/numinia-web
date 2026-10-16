/**
 * What the world routes (`[id].ts`, `[id]/pass.ts`) share: the till's desk and
 * the fleet's worlds — their ids and the host each is served at. The fleet is
 * the one the worlds room reads (lib/fleet.ts), or the fixture's under
 * DATA_SOURCE=fixture. The leading underscore keeps Astro from routing it.
 */

import legacyBook from '../../../data/legacy-worlds.json';
import fixtureFleet from '../../../../fixtures/worlds/fleet.json';
import { accountsFrom } from '../../../lib/accounts-source';
import { readMachine, type MachineView } from '../../../lib/fleet';
import { runtimeBinding } from '../../../lib/runtime-env';
import { FLEET_MACHINES } from '../../../lib/worlds';
import { fleetWorldHosts, fleetWorldIds } from '../../../lib/worlds-homes';

export const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

type Legacy = readonly { readonly id: string; readonly domain?: string }[];

// The worlds the old machine runs by hand: watched, never changed.
const LEGACY = (legacyBook as unknown as { readonly worlds: Legacy }).worlds;
const FIXTURE = fixtureFleet as unknown as {
  readonly machines: readonly MachineView[];
  readonly legacy: Legacy;
};

/** The fleet's machines and the hand-run worlds, as the room reads them. */
async function fleet(): Promise<{ views: readonly MachineView[]; legacy: Legacy }> {
  if (process.env.DATA_SOURCE === 'fixture') {
    return { views: FIXTURE.machines, legacy: FIXTURE.legacy };
  }
  const views = await Promise.all(
    FLEET_MACHINES.map((machine) => readMachine(fetch, machine.alias)),
  );
  return { views, legacy: LEGACY };
}

/** The ids the fleet has, and each world's host: one read of the fleet. */
export async function fleetWorlds(): Promise<{
  ids: ReadonlySet<string>;
  hosts: ReadonlyMap<string, string>;
}> {
  const { views, legacy } = await fleet();
  return { ids: fleetWorldIds(views, legacy), hosts: fleetWorldHosts(views, legacy) };
}
