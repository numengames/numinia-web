import { describe, expect, it } from 'vitest';
import {
  fromSearch,
  orgBalanceHref,
  paidBalanceHref,
  wantsWizard,
  wizardTopupHref,
  worldsWizardHref,
} from '../topup-return';

describe('the way back from a top-up', () => {
  it('sends a paid organization top-up to that organization’s balance, never to the personal one', () => {
    expect(paidBalanceHref('es', 'acc_t_2e2dd18c880ba974', '/es/saldo/')).toBe(
      '/es/panel/saldo/?org=acc_t_2e2dd18c880ba974',
    );
    expect(paidBalanceHref('en', 'acc_t_abc', '/saldo/')).toBe('/panel/saldo/?org=acc_t_abc');
  });

  it('keeps the personal balance for a personal account, an unknown one, or a strange id', () => {
    for (const account of [null, '', 'acc_p_abc', 'acc_t_', 'acc_t_a b', 'https://evil.example/']) {
      expect(paidBalanceHref('es', account, '/es/saldo/')).toBe('/es/saldo/');
    }
  });

  it('builds the wizard’s top-up link and the way back to the wizard, under the locale', () => {
    expect(orgBalanceHref('es', 'acc_t_abc')).toBe('/es/panel/saldo/?org=acc_t_abc');
    expect(wizardTopupHref('es', 'acc_t_abc')).toBe('/es/panel/saldo/?org=acc_t_abc&desde=mundos');
    expect(wizardTopupHref('en', 'acc_t_abc')).toBe('/panel/saldo/?org=acc_t_abc&desde=mundos');
    expect(worldsWizardHref('es')).toBe('/es/lap/admin/worlds/?nuevo=1');
  });

  it('reads the reason and the wizard request from an address', () => {
    expect(fromSearch('?org=acc_t_abc&desde=mundos')).toBe('worlds');
    expect(fromSearch('?desde=otra')).toBeNull();
    expect(fromSearch('')).toBeNull();
    expect(wantsWizard('?nuevo=1')).toBe(true);
    expect(wantsWizard('?nuevo=0')).toBe(false);
    expect(wantsWizard('')).toBe(false);
  });
});
