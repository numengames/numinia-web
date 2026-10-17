/**
 * A world's page rules (lib/world-page.ts): which encounters happen in a
 * world, its lead, its machine sheet, and «Compartir».
 */

import { describe, expect, it, vi } from 'vitest';
import { parseCommunity, parseRitual, type Community, type Ritual } from '../communities';
import {
  belongsToWorld,
  hostOf,
  machineSheet,
  shareLink,
  shareToolsOf,
  worldEncounters,
  worldLead,
  type PageWorld,
} from '../world-page';

const COMMUNITY = {
  name: 'Vic',
  kind: { en: 'City', es: 'Ciudad' },
  places: ['madrid'],
  summary: { en: 'A city that builds.', es: 'Una ciudad que construye.' },
  links: [{ label: 'vic.cat', href: 'https://www.vic.cat/' }],
};

const RITUAL = {
  community: 'vic',
  title: 'GovTech',
  start: '2027-06-16',
  end: '2027-06-17',
  mode: 'in-person',
  where: { en: 'Vic', es: 'Vic' },
};

function community(id = 'vic', extra: Record<string, unknown> = {}): Community {
  return parseCommunity(id, { ...COMMUNITY, ...extra });
}

function ritual(id: string, extra: Record<string, unknown> = {}): Ritual {
  return parseRitual(id, { ...RITUAL, ...extra });
}

const WORLD: PageWorld = { id: 'vic-plaza', domain: 'vic.numinia.com', community: 'vic' };

describe('hostOf', () => {
  it('reads the host of an https address, lowercased, and nothing else', () => {
    expect(hostOf('https://Vic.numinia.com/')).toBe('vic.numinia.com');
    expect(hostOf('https://vic.numinia.com')).toBe('vic.numinia.com');
    expect(hostOf('https://vic.numinia.com:443/x?y#z')).toBe('vic.numinia.com');
    expect(hostOf('http://vic.numinia.com/')).toBeNull();
    expect(hostOf('vic.numinia.com')).toBeNull();
    expect(hostOf(undefined)).toBeNull();
  });
});

describe('belongsToWorld', () => {
  it('says yes when the community’s sede is the world’s address, whatever the mode', () => {
    const vic = community('vic', { sede: { href: 'https://VIC.numinia.com/' } });
    expect(belongsToWorld(ritual('a'), vic, WORLD, ['vic-plaza', 'vic-other'])).toBe(true);
    expect(belongsToWorld(ritual('a', { mode: 'online' }), vic, WORLD, [])).toBe(true);
  });

  it('says yes for an online encounter of a community with exactly this one world', () => {
    const vic = community();
    expect(belongsToWorld(ritual('a', { mode: 'online' }), vic, WORLD, ['vic-plaza'])).toBe(true);
    expect(belongsToWorld(ritual('a', { mode: 'online' }), vic, WORLD, ['other'])).toBe(false);
    expect(
      belongsToWorld(ritual('a', { mode: 'online' }), vic, WORLD, ['vic-plaza', 'other']),
    ).toBe(false);
    expect(belongsToWorld(ritual('a', { mode: 'online' }), vic, WORLD, [])).toBe(false);
  });

  it('says no for an in-person or mixed encounter without a sede match, or no mode', () => {
    const vic = community();
    expect(belongsToWorld(ritual('a'), vic, WORLD, ['vic-plaza'])).toBe(false);
    expect(belongsToWorld(ritual('a', { mode: 'mixed' }), vic, WORLD, ['vic-plaza'])).toBe(false);
    const { mode: _mode, ...noMode } = RITUAL;
    expect(belongsToWorld(parseRitual('a', noMode), vic, WORLD, ['vic-plaza'])).toBe(false);
  });

  it('says no when the community is unknown, another’s, or the sede is elsewhere', () => {
    expect(belongsToWorld(ritual('a'), undefined, WORLD, ['vic-plaza'])).toBe(false);
    const other = community('other', { sede: { href: 'https://vic.numinia.com/' } });
    expect(belongsToWorld(ritual('a'), other, WORLD, ['vic-plaza'])).toBe(false);
    const elsewhere = community('vic', { sede: { href: 'https://else.numinia.com/' } });
    expect(belongsToWorld(ritual('a'), elsewhere, WORLD, ['vic-plaza', 'x'])).toBe(false);
    const noDomain: PageWorld = { ...WORLD, domain: null };
    const vic = community('vic', { sede: { href: 'https://vic.numinia.com/' } });
    expect(belongsToWorld(ritual('a'), vic, noDomain, ['vic-plaza', 'x'])).toBe(false);
  });
});

describe('worldEncounters', () => {
  it('keeps the upcoming encounters of the world, nearest first, held ones out', () => {
    const vic = community('vic', { sede: { href: 'https://vic.numinia.com/' } });
    const other = community('other');
    const rituals = [
      ritual('late', { start: '2027-09-01', end: '2027-09-01' }),
      ritual('soon'),
      ritual('held', { status: 'held' }),
      ritual('theirs', { community: 'other', mode: 'online' }),
    ];
    const worlds = [
      { id: 'vic-plaza', community: 'vic' },
      { id: 'other-world', community: 'other' },
    ];
    const found = worldEncounters(WORLD, worlds, [vic, other], rituals);
    expect(found.map((entry) => entry.id)).toEqual(['soon', 'late']);
    const theirs = worldEncounters(
      { id: 'other-world', domain: 'o.numinia.com', community: 'other' },
      worlds,
      [vic, other],
      rituals,
    );
    expect(theirs.map((entry) => entry.id)).toEqual(['theirs']);
  });

  it('finds nothing for a world whose community is not on file', () => {
    expect(worldEncounters(WORLD, [], [], [ritual('a')])).toEqual([]);
  });
});

describe('worldLead', () => {
  it('is the community’s summary in the page’s language', () => {
    expect(worldLead(community(), 'es')).toBe('Una ciudad que construye.');
    expect(worldLead(community(), 'ja')).toBe('A city that builds.');
  });
});

describe('machineSheet', () => {
  it('names the machine as words, and nothing for a world run by hand', () => {
    expect(machineSheet('open-1')).toEqual({ name: 'Open 1' });
    expect(machineSheet('bronte-xs-ca-003')).toEqual({ name: 'Bronte Xs Ca 003' });
    expect(machineSheet(null)).toBeNull();
    expect(machineSheet('  ')).toBeNull();
  });
});

describe('shareLink', () => {
  const page = { title: 'Agora Plaza', url: 'https://numinia.com/es/mundos/agora-plaza/' };

  it('uses the share sheet when the browser has one', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const copy = vi.fn();
    expect(await shareLink({ share, copy }, page.title, page.url)).toBe('shared');
    expect(share).toHaveBeenCalledWith(page);
    expect(copy).not.toHaveBeenCalled();
  });

  it('treats a closed share sheet as shared, and falls back to the clipboard on any other failure', async () => {
    const closed = vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError'));
    expect(await shareLink({ share: closed, copy: vi.fn() }, page.title, page.url)).toBe('shared');
    const broken = vi.fn().mockRejectedValue(new Error('nope'));
    const copy = vi.fn().mockResolvedValue(undefined);
    expect(await shareLink({ share: broken, copy }, page.title, page.url)).toBe('copied');
    expect(copy).toHaveBeenCalledWith(page.url);
    const odd = vi.fn().mockRejectedValue('not an error');
    expect(await shareLink({ share: odd, copy }, page.title, page.url)).toBe('copied');
  });

  it('copies the link where there is no share sheet, and says so when it cannot', async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    expect(await shareLink({ share: null, copy }, page.title, page.url)).toBe('copied');
    const refused = vi.fn().mockRejectedValue(new Error('denied'));
    expect(await shareLink({ share: null, copy: refused }, page.title, page.url)).toBe('failed');
    expect(await shareLink({ share: null, copy: null }, page.title, page.url)).toBe('failed');
  });
});

describe('shareToolsOf', () => {
  it('binds what the navigator has, and nothing where it has nothing', () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const nav = { share, clipboard: { writeText } } as unknown as Navigator;
    const tools = shareToolsOf(nav);
    expect(tools.share).not.toBeNull();
    expect(tools.copy).not.toBeNull();
    void tools.share?.({ title: 't', url: 'u' });
    void tools.copy?.('u');
    expect(share).toHaveBeenCalledWith({ title: 't', url: 'u' });
    expect(writeText).toHaveBeenCalledWith('u');
    expect(shareToolsOf({} as Navigator)).toEqual({ share: null, copy: null });
    expect(shareToolsOf({ clipboard: {} } as Navigator)).toEqual({ share: null, copy: null });
    expect(shareToolsOf(undefined)).toEqual({ share: null, copy: null });
  });
});
