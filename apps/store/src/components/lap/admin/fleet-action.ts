/**
 * One signed request, from the click to the machine's answer: build it,
 * have the wallet sign it, hand it to the machine's door. Once the machine
 * takes it (202) the dialog has done its job: the machine does the rest on
 * its own and the room shows it on the world's card. Only a download waits
 * here, for its zip. Each step the browser saw is told to the machine's door
 * in one beacon, so a failure that never reached the machine still counts.
 */

import { useCallback, useRef, useState } from 'react';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import {
  CODE_KINDS,
  IMPORT_RULES,
  buildRequest,
  copyDone,
  newNonce,
  readCopy,
  sendBeacon,
  sendRequest,
  shortWallet,
  typedData,
  waitFor,
  type Ask,
  type BeaconEvent,
  type BeaconSender,
  type BeaconStep,
  type CopyStatus,
  type DoorError,
  type ImportRule,
} from '../../../lib/fleet';
import { fill } from '../../../lib/worlds';
import { signWithWallet, type SignProblem } from './fleet-wallet';

/** The machine refused after trying (`machine`), or has not finished in the time the room waits (`late`). */
export type Problem = SignProblem | DoorError | 'machine' | 'late';

export type Step =
  | { readonly at: 'idle' }
  | { readonly at: 'signing' }
  | { readonly at: 'sending' }
  /**
   * The machine took it and does it on its own; a create carries the new
   * world's own admin code, and every request its number (a world from its
   * zip: the slot its zip goes to).
   */
  | { readonly at: 'accepted'; readonly code: string | null; readonly request: string }
  | { readonly at: 'preparing' }
  | {
      /** A code shown or changed (its code), or a copy ready (its zip). */
      readonly at: 'done';
      readonly code: string | null;
      readonly copy: { readonly id: string; readonly status: CopyStatus } | null;
    }
  | { readonly at: 'failed'; readonly problem: Problem; readonly detail: string };

/** A step that is still on its way: the dialog keeps its buttons quiet meanwhile. */
export const busy = (step: Step): boolean =>
  step.at === 'signing' || step.at === 'sending' || step.at === 'preparing';

const WAIT_MS = 2000;
const COPY_WAIT_MS = 15 * 60_000;

/** The browser's own beacon, when it has one. */
function beaconSender(): BeaconSender | null {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return null;
  return (url, body) => navigator.sendBeacon(url, body);
}

/**
 * `listens` says whether a machine's door takes the room's beacons: only those
 * that say so on their `/machine` hear what happened in the browser.
 */
export function useFleetAction(sessionWallet: string | null, listens: (alias: string) => boolean) {
  const [step, setStep] = useState<Step>({ at: 'idle' });
  // Each run has a number; closing the dialog (reset) or a new run makes the old one stop.
  const runs = useRef(0);

  const reset = useCallback(() => {
    runs.current += 1;
    setStep({ at: 'idle' });
  }, []);

  const run = useCallback(
    async (ask: Ask): Promise<void> => {
      runs.current += 1;
      const mine = runs.current;
      const current = (): boolean => runs.current === mine;
      const set = (next: Step): void => {
        if (current()) setStep(next);
      };
      const started = Date.now();
      const seen: BeaconEvent[] = [];
      const note = (where: BeaconStep, problem: string | null = null): void => {
        seen.push({ step: where, type: ask.kind, problem, ms: Date.now() - started });
      };
      try {
        note('asked');
        set({ at: 'signing' });
        const request = buildRequest(ask, newNonce(), started);
        const signed = await signWithWallet(typedData(request), sessionWallet);
        // Closed while the wallet was asking: whatever was signed, nothing is sent.
        if (!current()) return;
        if (!signed.ok) {
          note('wallet-refused', signed.problem);
          set({ at: 'failed', problem: signed.problem, detail: signed.wallet ?? '' });
          return;
        }
        note('signed');
        set({ at: 'sending' });
        const accepted = await sendRequest(fetch, request, signed.signature);
        if (!accepted.ok) {
          note(accepted.error === 'unreachable' ? 'unreachable' : 'refused', accepted.error);
          set({ at: 'failed', problem: accepted.error, detail: String(accepted.status) });
          return;
        }
        note('accepted');
        if (CODE_KINDS.includes(ask.kind)) {
          // The code is what the Oracle came for: a door that took the request
          // without one it can show has given none.
          if (accepted.adminCode === null) {
            set({ at: 'failed', problem: 'no-admin-code', detail: '' });
          } else {
            set({ at: 'done', code: accepted.adminCode, copy: null });
          }
          return;
        }
        if (ask.kind === 'DownloadWorld' && accepted.copy !== null) {
          const id = accepted.copy;
          set({ at: 'preparing' });
          const status = await waitFor(() => readCopy(fetch, ask.machine, id), copyDone, {
            intervalMs: WAIT_MS,
            timeoutMs: COPY_WAIT_MS,
            cancelled: () => !current(),
          });
          if (status === null || status.state === 'preparing') {
            if (current()) note('late', 'late');
            set({ at: 'failed', problem: 'late', detail: '' });
          } else if (status.state === 'failed') {
            note('copy-failed', 'machine');
            set({ at: 'failed', problem: 'machine', detail: 'copy' });
          } else {
            note('copy-ready');
            set({ at: 'done', code: null, copy: { id, status } });
          }
          return;
        }
        // A world from its zip: a door that took it must say where the zip goes.
        if (ask.kind === 'ImportWorld' && accepted.upload === null) {
          note('refused', 'unexpected');
          set({ at: 'failed', problem: 'unexpected', detail: '202' });
          return;
        }
        set({ at: 'accepted', code: accepted.adminCode, request: accepted.request });
      } finally {
        if (listens(ask.machine)) sendBeacon(ask.machine, seen, beaconSender());
      }
    },
    [sessionWallet, listens],
  );

  return { step, run, reset };
}

const PROBLEM_WORDS: Readonly<Partial<Record<Problem, keyof WorldsRoomMessages['problems']>>> = {
  'no-wallet': 'noWallet',
  'other-wallet': 'otherWallet',
  declined: 'declined',
  'not-an-oracle-here': 'notOracle',
  expired: 'expired',
  replayed: 'replayed',
  exists: 'exists',
  'address-taken': 'addressTaken',
  'still-deleting': 'stillDeleting',
  missing: 'missing',
  'address-mismatch': 'addressMismatch',
  refused: 'refused',
  'other-machine': 'otherMachine',
  'slow-down': 'slowDown',
  'no-admin-code': 'noAdminCode',
  busy: 'busy',
  origin: 'origin',
  unreachable: 'unreachable',
  machine: 'machine',
  late: 'late',
};

/** Whether a door's refusal is one of a world's zip's rules, which have words of their own. */
export const isImportRule = (problem: string): problem is ImportRule =>
  (IMPORT_RULES as readonly string[]).includes(problem);

/**
 * What went wrong, in the room's words; anything without words of its own
 * says its code. `values` fills a zip rule's own blanks (`{f}` the zip's
 * name, `{s}` its size, `{max}` its machine's cap). From a door, `unexpected`
 * is an answer the room could not read: the machine's own rule of that name
 * only ever comes back in a request's result, never in a refusal.
 */
export function problemText(
  step: Extract<Step, { at: 'failed' }>,
  machine: string,
  room: WorldsRoomMessages,
  values: Readonly<Record<string, string | number>> = {},
): string {
  if (step.problem !== 'unexpected' && isImportRule(step.problem)) {
    return fill(room.import.rules[step.problem], {
      f: '?',
      s: '?',
      max: '?',
      ...values,
      m: machine,
    });
  }
  const key = PROBLEM_WORDS[step.problem] ?? 'generic';
  return fill(room.problems[key], {
    m: machine,
    w: step.detail === '' ? '?' : shortWallet(step.detail),
    rule: step.detail,
    code: step.problem,
  });
}

/** The line that says where a signed request is, while it is on its way. */
export function stepText(step: Step, machine: string, room: WorldsRoomMessages): string | null {
  if (step.at === 'signing') return room.steps.signing;
  if (step.at === 'sending') return fill(room.steps.sending, { m: machine });
  if (step.at === 'preparing') return fill(room.steps.preparing, { m: machine });
  return null;
}
