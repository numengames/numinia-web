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
import type { FleetEntry } from '../../../lib/world-index';

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

/**
 * Every world the fleet lists, as the index of worlds (/mundos/) reads it:
 * its id, its phase and its address; a world run by hand names no phase.
 */
export async function fleetEntries(): Promise<readonly FleetEntry[]> {
  const { views, legacy } = await fleet();
  return [
    ...views.flatMap((view) =>
      view.open
        ? view.worlds.map((world) => ({ id: world.id, phase: world.phase, domain: world.domain }))
        : [],
    ),
    ...legacy.map((world) => ({ id: world.id, phase: null, domain: world.domain ?? null })),
  ];
}

/**
 * Which machine runs each world (its alias), as the fleet's doors say it:
 * the first machine that lists a world keeps it. A world run by hand is on
 * no machine of the fleet and is not in the map.
 */
export async function fleetMachines(): Promise<ReadonlyMap<string, string>> {
  const { views } = await fleet();
  const machines = new Map<string, string>();
  for (const view of views) {
    if (!view.open) continue;
    for (const world of view.worlds) {
      if (!machines.has(world.id)) machines.set(world.id, view.alias);
    }
  }
  return machines;
}
