/**
 * The page-wide "the session changed" signal — so signing in shows what the
 * rank opens without a reload.
 *
 * The sign-in island fires it after every sign-in and sign-out; whatever on
 * the same page shows or hides by rank (the LAP shell's management zone and
 * the Oracle's rooms) listens and reads the session again. A plain DOM event
 * on `window`: neither side imports the other, and no state library enters
 * the client bundle.
 */

/** The event's name, in one place so the sender and the listeners agree. */
export const SESSION_CHANGED = 'numinia:session-changed';

/** Tell the page the session changed (after a sign-in or a sign-out). */
export function announceSessionChange(target: EventTarget): void {
  target.dispatchEvent(new Event(SESSION_CHANGED));
}

/** Run `listener` on every announced change; returns the way to stop. */
export function onSessionChange(target: EventTarget, listener: () => void): () => void {
  const handler = (): void => listener();
  target.addEventListener(SESSION_CHANGED, handler);
  return () => target.removeEventListener(SESSION_CHANGED, handler);
}
