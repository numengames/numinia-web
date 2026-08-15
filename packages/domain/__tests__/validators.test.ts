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
      expect((error as Error).name).toBe('EnvValidationError');
      expect((error as Error).message).toContain('Invalid environment variables');
    }
  });

  it('formats every issue as "VAR: message" on its own indented line', () => {
    try {
      parseEnv({});
      expect.unreachable('parseEnv must throw');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('\n  GITHUB_REPO_OWNER:');
      expect(message).toContain('\n  GITHUB_REPO_NAME:');
    }
  });

  it('names the variable in the empty-string message too', () => {
    try {
      parseEnv({ ...valid, GITHUB_REPO_OWNER: '' });
      expect.unreachable('parseEnv must throw');
    } catch (error) {
      expect((error as Error).message).toContain('GITHUB_REPO_OWNER is required');
    }
    try {
      parseEnv({ ...valid, GITHUB_REPO_NAME: '' });
      expect.unreachable('parseEnv must throw');
    } catch (error) {
      expect((error as Error).message).toContain('GITHUB_REPO_NAME is required');
    }
  });

  it('accepts an explicit multi-character branch', () => {
    expect(parseEnv({ ...valid, GITHUB_BRANCH: 'develop' }).githubBranch).toBe('develop');
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

  it('defaults DATA_SOURCE to network and accepts both explicit values', () => {
    expect(parseEnv(valid).dataSource).toBe('network');
    expect(parseEnv({ ...valid, DATA_SOURCE: 'network' }).dataSource).toBe('network');
    expect(parseEnv({ ...valid, DATA_SOURCE: 'fixture' }).dataSource).toBe('fixture');
    expect(() => parseEnv({ ...valid, DATA_SOURCE: 'wat' })).toThrowError(EnvValidationError);
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

  it('accepts a real-shaped record and normalizes it to the exact envelope', () => {
    const asset = parseAssetRecord(validRecord);
    expect(asset).toEqual({
      id: validRecord.id,
      name: validRecord.name,
      description: validRecord.description,
      format: 'glb',
      license: 'CC0',
      projectId: '',
      modelFileUrl: validRecord.model_file_url,
      thumbnailUrl: null,
      tags: [],
      isPublic: true,
      isDraft: false,
      createdAt: '',
      updatedAt: '',
      storage: { arweaveTx: null, r2Url: null, ipfsCid: null, githubRawUrl: null },
    });
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

  it('parses a whole catalog and reports the offending index with field detail', () => {
    expect(parseAssetCatalog([validRecord, { ...validRecord, id: 'ndg-2' }])).toHaveLength(2);
    try {
      parseAssetCatalog([validRecord, { broken: true }]);
      expect.unreachable('parseAssetCatalog must throw');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('Asset catalog invalid at index 1');
      expect(message).toMatch(/id: /);
      expect(message).toContain('; '); // multiple issues joined
    }
  });

  it('rejects non-array catalogs with a dedicated message', () => {
    expect(() => parseAssetCatalog({ not: 'an array' })).toThrowError(
      'Asset catalog must be a JSON array',
    );
  });

  it('reports root-level detail for a null record inside the catalog', () => {
    expect(() => parseAssetCatalog([null])).toThrowError(/index 0 — \(root\)/);
  });

  it('reports nested field paths with dot notation', () => {
    expect(() => parseAssetCatalog([{ ...validRecord, storage: { arweave_tx: 42 } }])).toThrowError(
      /storage\.arweave_tx/,
    );
  });

  it('applies exact defaults for a minimal record', () => {
    const asset = parseAssetRecord({ id: 'a', name: 'n', type: 'vrm' });
    expect(asset.description).toBe('');
    expect(asset.modelFileUrl).toBe('');
    expect(asset.isPublic).toBe(true);
    expect(asset.isDraft).toBe(false);
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
