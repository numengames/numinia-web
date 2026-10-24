/**
 * The world's HTTP door for the blocks of a world's page that manage it («IA», «Funciones de este
 * mundo»): one door, so one pass is asked for and renewed for the whole page. Under
 * DATA_SOURCE=fixture the door is an in-memory stand-in (lib/world-door-fixture.ts).
 */

import { useMemo } from 'react';
import { askPass, createDoor, createPassKeeper, type Door } from '../../lib/world-door';
import { FIXTURE_PASS, createFixtureDoor } from '../../lib/world-door-fixture';

const FIXTURE_WORLD = 'https://fixture.world.invalid/';

/** Fixture only: `?motor=viejo` makes the stand-in world answer like an engine without `/funciones`. */
const oldFixtureEngine = (): boolean =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('motor') === 'viejo';

export function useWorldDoor(
  worldId: string,
  /** The world's own address, from the world's data. */
  worldUrl: string | null,
  fixture: boolean,
): Door {
  return useMemo(() => {
    const keeper = createPassKeeper(
      fixture ? async () => FIXTURE_PASS : () => askPass(fetch, worldId),
      Date.now,
    );
    return createDoor({
      fetch: fixture
        ? createFixtureDoor({ functions: !oldFixtureEngine() })
        : (input, init) => fetch(input, init),
      worldUrl: fixture ? FIXTURE_WORLD : worldUrl,
      keeper,
    });
  }, [fixture, worldId, worldUrl]);
}
