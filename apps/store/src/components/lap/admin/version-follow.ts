/**
 * The version requests this tab has handed to a machine and that the machine
 * has not finished: a publication (the world goes off a few seconds), a copy
 * being made, a version deleted. The dialog closes the moment the machine takes
 * the request; from there the room asks the machine how it goes, keeps the
 * world list current meanwhile, and says how it ended — a refusal the machine
 * found only after taking it, or that the version is there now.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import {
  readRequest,
  settled,
  versionOutcome,
  waitFor,
  type RequestResult,
} from '../../../lib/fleet';
import type { FollowedKind, VersionJob } from './WorldVersions';

/** How often the room asks a machine how a version request goes, and for how long at most. */
const FOLLOW_MS = 3000;
const FOLLOW_FOR_MS = 30 * 60_000;
/** The version a copy just made stands out on its card this long. */
const MADE_MS = 8000;

export interface VersionNote {
  readonly ok: boolean;
  readonly text: string;
}

export function useVersionJobs(
  load: () => void,
  room: WorldsRoomMessages,
  /** Better words for what a machine refused after taking the request (a zip's own rule); null: the version words. */
  explain?: (job: VersionJob, result: RequestResult) => string | null,
) {
  const [jobs, setJobs] = useState<readonly VersionJob[]>([]);
  const [note, setNote] = useState<VersionNote | null>(null);
  const [made, setMade] = useState<{ readonly world: string; readonly version: string } | null>(
    null,
  );
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  // The latest of each, for a follow that outlives the render that began it.
  const latest = useRef({ load, room, explain });
  latest.current = { load, room, explain };

  const follow = useCallback((job: VersionJob): void => {
    setJobs((current) => [...current, job]);
    setNote(null);
    void (async () => {
      const result = await waitFor(() => readRequest(fetch, job.machine, job.request), settled, {
        intervalMs: FOLLOW_MS,
        timeoutMs: FOLLOW_FOR_MS,
        cancelled: () => !alive.current,
      });
      if (!alive.current) return;
      setJobs((current) => current.filter((candidate) => candidate.request !== job.request));
      const explain = latest.current.explain;
      const outcome = versionOutcome(
        job,
        result,
        latest.current.room.versions,
        explain === undefined ? undefined : (found) => explain(job, found),
      );
      if (outcome !== null) {
        setNote({ ok: outcome.ok, text: outcome.text });
        if (outcome.made !== null) setMade({ world: job.world, version: outcome.made });
      }
      latest.current.load();
    })();
  }, []);

  // The new version stands out for a moment, then settles.
  useEffect(() => {
    if (made === null) return;
    const timer = setTimeout(() => setMade(null), MADE_MS);
    return () => clearTimeout(timer);
  }, [made]);

  const following = new Map<string, FollowedKind>(jobs.map((job) => [job.world, job.kind]));
  return { jobs, following, note, made, follow, dismiss: () => setNote(null) };
}
