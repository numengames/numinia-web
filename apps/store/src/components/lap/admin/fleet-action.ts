/**
 * One signed request, from the click to the machine's answer: build it,
 * have the wallet sign it, hand it to the machine's door, then follow it —
 * or, for a download, its copy — until the machine is done. The dialogs
 * show each step as it happens, and what went wrong in plain words.
 */

import { useCallback, useRef, useState } from 'react';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import {
  buildRequest,
  copyDone,
  newNonce,
  readCopy,
  readRequest,
  sendRequest,
  settled,
  shortWallet,
  typedData,
  waitFor,
  type Ask,
  type CopyStatus,
  type DoorError,
} from '../../../lib/fleet';
import { fill } from '../../../lib/worlds';
import { signWithWallet, type SignProblem } from './fleet-wallet';

/** The machine refused after trying (`machine`), or has not finished in the time the room waits (`late`). */
export type Problem = SignProblem | DoorError | 'machine' | 'late';

export type Step =
  | { readonly at: 'idle' }
  | { readonly at: 'signing' }
  | { readonly at: 'sending' }
  /** The machine took it and is doing it; a create already carries the admin code. */
  | { readonly at: 'working'; readonly code: string | null }
  | { readonly at: 'preparing' }
  | {
      readonly at: 'done';
      readonly code: string | null;
      readonly copy: { readonly id: string; readonly status: CopyStatus } | null;
    }
  | { readonly at: 'failed'; readonly problem: Problem; readonly detail: string };

/** A step that is still on its way: the dialog keeps its buttons quiet meanwhile. */
export const busy = (step: Step): boolean =>
  step.at === 'signing' ||
  step.at === 'sending' ||
  step.at === 'working' ||
  step.at === 'preparing';

const WAIT_MS = 2000;
const REQUEST_WAIT_MS = 3 * 60_000;
const COPY_WAIT_MS = 15 * 60_000;

export function useFleetAction(sessionWallet: string | null) {
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
      set({ at: 'signing' });
      const request = buildRequest(ask, newNonce(), Date.now());
      const signed = await signWithWallet(typedData(request), sessionWallet);
      // Closed while the wallet was asking: whatever was signed, nothing is sent.
      if (!current()) return;
      if (!signed.ok) {
        set({ at: 'failed', problem: signed.problem, detail: signed.wallet ?? '' });
        return;
      }
      set({ at: 'sending' });
      const accepted = await sendRequest(fetch, request, signed.signature);
      if (!accepted.ok) {
        set({ at: 'failed', problem: accepted.error, detail: String(accepted.status) });
        return;
      }
      const alias = ask.machine;
      const waiting = { intervalMs: WAIT_MS, cancelled: () => !current() };
      if (ask.kind === 'ShowAdminCode') {
        set({ at: 'done', code: accepted.adminCode, copy: null });
        return;
      }
      if (ask.kind === 'DownloadWorld' && accepted.copy !== null) {
        const id = accepted.copy;
        set({ at: 'preparing' });
        const status = await waitFor(() => readCopy(fetch, alias, id), copyDone, {
          ...waiting,
          timeoutMs: COPY_WAIT_MS,
        });
        if (status === null || status.state === 'preparing') {
          set({ at: 'failed', problem: 'late', detail: '' });
        } else if (status.state === 'failed') {
          set({ at: 'failed', problem: 'machine', detail: 'copy' });
        } else {
          set({ at: 'done', code: null, copy: { id, status } });
        }
        return;
      }
      set({ at: 'working', code: accepted.adminCode });
      const result = await waitFor(() => readRequest(fetch, alias, accepted.request), settled, {
        ...waiting,
        timeoutMs: REQUEST_WAIT_MS,
      });
      if (result === null || !settled(result)) {
        set({ at: 'failed', problem: 'late', detail: '' });
      } else if (result.state === 'failed') {
        set({ at: 'failed', problem: 'machine', detail: result.rule ?? '?' });
      } else {
        set({ at: 'done', code: accepted.adminCode, copy: null });
      }
    },
    [sessionWallet],
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
  missing: 'missing',
  'address-mismatch': 'addressMismatch',
  refused: 'refused',
  'other-machine': 'otherMachine',
  'slow-down': 'slowDown',
  'no-admin-code': 'noAdminCode',
  origin: 'origin',
  unreachable: 'unreachable',
  machine: 'machine',
  late: 'late',
};

/** What went wrong, in the room's words; anything without words of its own says its code. */
export function problemText(
  step: Extract<Step, { at: 'failed' }>,
  machine: string,
  room: WorldsRoomMessages,
): string {
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
  if (step.at === 'working') return fill(room.steps.working, { m: machine });
  if (step.at === 'preparing') return fill(room.steps.preparing, { m: machine });
  return null;
}
