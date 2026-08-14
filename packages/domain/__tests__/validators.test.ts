import { describe, expect, it } from 'vitest';
import { EnvValidationError, parseEnv } from '../src/validators/env.js';
import { parseAssetCatalog, parseAssetRecord } from '../src/validators/asset.js';

describe('env validation (fail closed — legacy audit rule 4)', () => {
  const valid = {
    GITHUB_REPO_OWNER: 'PabloFMM',
    GITHUB_REPO_NAME: 'numinia-digital-goods-data',
  };

  it('accepts a minimal valid environment and applies defaults', () => {
    const env = parseEnv(valid);
    expect(env.githubRepoOwner).toBe('PabloFMM');
    expect(env.githubRepoName).toBe('numinia-digital-goods-data');
    expect(env.githubBranch).toBe('main');
    expect(env.githubToken).toBeNull();
    expect(env.publicSiteUrl).toBe('http://localhost:4321');
  });

  it('crashes naming the missing variable — never a silent default', () => {
    expect(() => parseEnv({ GITHUB_REPO_NAME: 'x' })).toThrowError(EnvValidationError);
    try {
      parseEnv({ GITHUB_REPO_NAME: 'x' });
      expect.unreachable('parseEnv must throw');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect(String(error)).toContain('GITHUB_REPO_OWNER');
    }
  });

  it('rejects empty strings for required variables', () => {
    expect(() => parseEnv({ ...valid, GITHUB_REPO_OWNER: '' })).toThrowError(EnvValidationError);
  });

  it('rejects a malformed PUBLIC_SITE_URL', () => {
    expect(() => parseEnv({ ...valid, PUBLIC_SITE_URL: 'not a url' })).toThrowError(
      EnvValidationError,
    );
  });

  it('rejects a non-object environment with a root-level issue', () => {
    try {
      parseEnv(null as never);
      expect.unreachable('parseEnv must throw');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect(String(error)).toContain('(root)');
    }
  });

  it('normalizes an explicit empty token to null', () => {
    const env = parseEnv({ ...valid, GITHUB_TOKEN: '' });
    expect(env.githubToken).toBeNull();
    const withToken = parseEnv({ ...valid, GITHUB_TOKEN: 'ghp_x' });
    expect(withToken.githubToken).toBe('ghp_x');
  });
});

describe('asset catalog validation (build fails loudly — MISSION-000 data spike)', () => {
  const validRecord = {
    id: 'ndg-019dac82-f222-7a9d-b3a0-ea46901b97f8',
    name: 'Cognitive Map 0.1.0',
    type: 'glb',
    description: 'GLB asset uploaded via Numinia Admin',
    model_file_url: 'https://example.com/model.glb',
    is_public: true,
    is_draft: false,
  };

  it('accepts a real-shaped record and normalizes it', () => {
    const asset = parseAssetRecord(validRecord);
    expect(asset.id).toBe(validRecord.id);
    expect(asset.format).toBe('glb');
    expect(asset.isPublic).toBe(true);
    expect(asset.isDraft).toBe(false);
    expect(asset.tags).toEqual([]);
    expect(asset.license).toBe('CC0');
  });

  it('accepts legacy records with unknown extra fields (passthrough, no data loss surprises)', () => {
    const asset = parseAssetRecord({ ...validRecord, nft: { mint_status: 'unminted' } });
    expect(asset.name).toBe(validRecord.name);
  });

  it('rejects a record without id', () => {
    const { id: _id, ...rest } = validRecord;
    expect(() => parseAssetRecord(rest)).toThrowError();
  });

  it('rejects a record with an unknown format', () => {
    expect(() => parseAssetRecord({ ...validRecord, type: 'exe' })).toThrowError();
  });

  it('normalizes uppercase format labels from legacy data', () => {
    const asset = parseAssetRecord({ ...validRecord, type: 'VRM' });
    expect(asset.format).toBe('vrm');
  });

  it('parses a whole catalog and reports the offending index on failure', () => {
    expect(parseAssetCatalog([validRecord, { ...validRecord, id: 'ndg-2' }])).toHaveLength(2);
    try {
      parseAssetCatalog([validRecord, { broken: true }]);
      expect.unreachable('parseAssetCatalog must throw');
    } catch (error) {
      expect(String(error)).toContain('index 1');
    }
  });

  it('rejects non-array catalogs', () => {
    expect(() => parseAssetCatalog({ not: 'an array' })).toThrowError();
  });

  it('reports root-level detail for a null record inside the catalog', () => {
    expect(() => parseAssetCatalog([null])).toThrowError(/index 0 — \(root\)/);
  });

  it('normalizes an explicit storage block', () => {
    const asset = parseAssetRecord({
      ...validRecord,
      storage: { arweave_tx: 'tx1', r2: 'https://pub-x.r2.dev/a.glb' },
    });
    expect(asset.storage.arweaveTx).toBe('tx1');
    expect(asset.storage.r2Url).toBe('https://pub-x.r2.dev/a.glb');
    expect(asset.storage.ipfsCid).toBeNull();
  });
});
