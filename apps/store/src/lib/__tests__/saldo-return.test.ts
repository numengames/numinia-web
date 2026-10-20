import { describe, expect, it } from 'vitest';
import { backTarget, isAsk, noteMessage, readNote, VOLVER_ASK, volverParam } from '../saldo-return';

describe('volverParam', () => {
  it('keeps a path of this site', () => {
    expect(volverParam('?org=a&volver=%2Fes%2Flap%2Fadmin%2Fworlds%2F%3Fnuevo%3D1')).toBe(
      '/es/lap/admin/worlds/?nuevo=1',
    );
  });
  it('refuses other origins, nothing, and the way back itself', () => {
    expect(volverParam('?volver=https%3A%2F%2Fevil.example')).toBeNull();
    expect(volverParam('?volver=%2F%2Fevil.example')).toBeNull();
    expect(volverParam('?org=a')).toBeNull();
    expect(volverParam('?volver=%2Fes%2Fsaldo%2Fvuelta%2F%3Fcancelled%3D1')).toBeNull();
  });
});

describe('the question and the answer', () => {
  it('recognizes the question', () => {
    expect(isAsk(VOLVER_ASK)).toBe(true);
    expect(isAsk({ type: 'note' })).toBe(false);
    expect(isAsk(null)).toBe(false);
    expect(isAsk('ask')).toBe(false);
  });
  it('reads what noteMessage sent', () => {
    expect(readNote(noteMessage('acc_t_1', '/es/lap/admin/worlds/'))).toEqual({
      org: 'acc_t_1',
      back: '/es/lap/admin/worlds/',
    });
    expect(readNote(noteMessage('acc_t_1', null))?.back).toBeNull();
  });
  it('refuses anything else, and drops an address that is not a path of this site', () => {
    expect(readNote(null)).toBeNull();
    expect(readNote('x')).toBeNull();
    expect(readNote(VOLVER_ASK)).toBeNull();
    expect(readNote(noteMessage('', null))).toBeNull();
    expect(readNote({ type: 'note', org: 5, back: null })).toBeNull();
    expect(readNote(noteMessage('a', '//evil.example'))?.back).toBeNull();
    expect(readNote({ type: 'note', org: 'a', back: 7 })?.back).toBeNull();
  });
});

describe('backTarget', () => {
  const note = { org: 'acc_t_1', back: '/es/lap/admin/worlds/' };
  it('goes to Saldo when there is no note', () => {
    expect(backTarget(null, null, '/es/panel/saldo/', '/es/saldo/')).toEqual({
      saldo: '/es/saldo/',
      resume: null,
    });
  });
  it('goes to the organization, with the page to resume', () => {
    expect(backTarget(note, null, '/es/panel/saldo/', '/es/saldo/')).toEqual({
      saldo: '/es/panel/saldo/?org=acc_t_1',
      resume: '/es/lap/admin/worlds/',
    });
    expect(backTarget(note, 'acc_t_1', '/es/panel/saldo/', '/es/saldo/').resume).not.toBeNull();
  });
  it('ignores a note when the payment was another account’s', () => {
    expect(backTarget(note, 'acc_p_9', '/es/panel/saldo/', '/es/saldo/')).toEqual({
      saldo: '/es/saldo/',
      resume: null,
    });
  });
});
