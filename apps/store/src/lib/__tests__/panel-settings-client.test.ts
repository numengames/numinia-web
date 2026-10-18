import { describe, expect, it } from 'vitest';
import { loadSettings, saveSettings } from '../panel-settings-client';

const aiAgent = { enabled: true, model: 'gpt-5-nano', trialCapCents: 150, spentCents: 0 };
const settings = {
  accountId: 'acc t',
  off: ['roles'],
  vocabulary: 'simple',
  mayEdit: true,
  aiAgent,
};
const answer =
  (body: unknown, status = 200) =>
  () =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('reading the settings in the browser', () => {
  it('asks for the organization, encoded, and reads the answer', async () => {
    const seen: string[] = [];
    const read = await loadSettings((input) => {
      seen.push(input);
      return answer({ settings })();
    }, 'acc t');
    expect(seen).toEqual(['/api/saldo/settings?cuenta=acc%20t']);
    expect(read).toEqual({ ok: true, ...settings });
  });

  it('is null when the till refused, answered out of shape, answered no JSON or the network failed', async () => {
    expect(await loadSettings(answer({ error: 'refused' }, 403), 'a')).toBeNull();
    expect(await loadSettings(answer({ settings: 1 }), 'a')).toBeNull();
    expect(await loadSettings(() => Promise.resolve(new Response('x')), 'a')).toBeNull();
    expect(await loadSettings(() => Promise.reject(new Error('offline')), 'a')).toBeNull();
  });
});

describe('saving the settings in the browser', () => {
  it('posts the organization with the change, JSON, and reads what the till now holds', async () => {
    const sent: { url: string; init: RequestInit | undefined }[] = [];
    const saved = await saveSettings(
      (url, init) => {
        sent.push({ url, init });
        return answer({ settings })();
      },
      'acc_t_1',
      { off: ['roles'] },
    );
    expect(saved).toEqual({ ok: true, ...settings });
    expect(sent[0]?.url).toBe('/api/saldo/settings');
    expect(sent[0]?.init?.method).toBe('POST');
    expect(JSON.parse(String(sent[0]?.init?.body))).toEqual({
      accountId: 'acc_t_1',
      off: ['roles'],
    });
  });

  it('is null when refused, out of shape, not JSON or offline', async () => {
    expect(await saveSettings(answer({ error: 'refused' }, 403), 'a', { off: [] })).toBeNull();
    expect(await saveSettings(answer({}), 'a', { off: [] })).toBeNull();
    expect(await saveSettings(() => Promise.resolve(new Response('x')), 'a', {})).toBeNull();
    expect(await saveSettings(() => Promise.reject(new Error('offline')), 'a', {})).toBeNull();
  });

  it('posts aiAgentEnabled (Historia 4’s switch) the same way', async () => {
    const sent: { url: string; init: RequestInit | undefined }[] = [];
    await saveSettings(
      (url, init) => {
        sent.push({ url, init });
        return answer({ settings: { ...settings, aiAgent: { ...aiAgent, enabled: false } } })();
      },
      'acc_t_1',
      { aiAgentEnabled: false },
    );
    expect(JSON.parse(String(sent[0]?.init?.body))).toEqual({
      accountId: 'acc_t_1',
      aiAgentEnabled: false,
    });
  });
});
