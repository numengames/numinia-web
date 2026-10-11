/**
 * Signing in must show the rooms the rank opens on the same page, with no
 * reload: the sign-in island announces the change, the LAP shell listens.
 */

import { describe, expect, it, vi } from 'vitest';
import { announceSessionChange, onSessionChange, SESSION_CHANGED } from '../session-signal';

describe('session signal', () => {
  it('reaches every listener on the page, once per announcement', () => {
    const page = new EventTarget();
    const shell = vi.fn();
    const card = vi.fn();
    onSessionChange(page, shell);
    onSessionChange(page, card);

    announceSessionChange(page); // signed in
    announceSessionChange(page); // signed out

    expect(shell).toHaveBeenCalledTimes(2);
    expect(card).toHaveBeenCalledTimes(2);
  });

  it('stops when asked, and leaves the other listeners alone', () => {
    const page = new EventTarget();
    const gone = vi.fn();
    const kept = vi.fn();
    const stop = onSessionChange(page, gone);
    onSessionChange(page, kept);

    stop();
    announceSessionChange(page);

    expect(gone).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledOnce();
  });

  it('stays on its own page', () => {
    const here = new EventTarget();
    const elsewhere = new EventTarget();
    const listener = vi.fn();
    onSessionChange(elsewhere, listener);

    announceSessionChange(here);

    expect(listener).not.toHaveBeenCalled();
  });

  it('travels under a namespaced name, which plain DOM listeners can also hear', () => {
    const page = new EventTarget();
    const raw = vi.fn();
    page.addEventListener(SESSION_CHANGED, raw);

    announceSessionChange(page);

    expect(SESSION_CHANGED).toBe('numinia:session-changed');
    expect(raw).toHaveBeenCalledOnce();
  });
});
