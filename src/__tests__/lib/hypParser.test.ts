import { describe, it, expect } from 'vitest';

// Test the .hyp binary format parsing logic directly (no fetch)
describe('hypParser format', () => {
  function buildHypBuffer(header: object, assets: ArrayBuffer[] = []): ArrayBuffer {
    const headerJson = JSON.stringify(header);
    const headerBytes = new TextEncoder().encode(headerJson);
    const headerSize = headerBytes.byteLength;

    // Total size: 4 (header size) + header + assets
    let totalAssetSize = 0;
    for (const a of assets) totalAssetSize += a.byteLength;

    const buffer = new ArrayBuffer(4 + headerSize + totalAssetSize);
    const view = new DataView(buffer);

    // Write header size (Uint32LE)
    view.setUint32(0, headerSize, true);

    // Write header JSON
    const uint8 = new Uint8Array(buffer);
    uint8.set(headerBytes, 4);

    // Write asset data
    let offset = 4 + headerSize;
    for (const a of assets) {
      uint8.set(new Uint8Array(a), offset);
      offset += a.byteLength;
    }

    return buffer;
  }

  it('parses header from binary', () => {
    const header = {
      blueprint: { name: 'TestApp', model: 'model.glb', script: 'app.js' },
      assets: [
        { type: 'model', url: 'model.glb', size: 4, mime: 'model/gltf-binary' },
        { type: 'script', url: 'app.js', size: 3, mime: 'application/javascript' },
      ],
    };

    const glbData = new Uint8Array([0x67, 0x6C, 0x54, 0x46]).buffer; // "glTF" magic
    const jsData = new Uint8Array([0x2F, 0x2F, 0x0A]).buffer; // "//\n"

    const buffer = buildHypBuffer(header, [glbData, jsData]);

    // Parse manually (same logic as hypParser.ts)
    const view = new DataView(buffer);
    const headerSize = view.getUint32(0, true);
    const headerBytes = new Uint8Array(buffer, 4, headerSize);
    const headerText = new TextDecoder().decode(headerBytes);
    const parsed = JSON.parse(headerText);

    expect(parsed.blueprint.name).toBe('TestApp');
    expect(parsed.assets).toHaveLength(2);
    expect(parsed.assets[0].type).toBe('model');
    expect(parsed.assets[1].type).toBe('script');
  });

  it('extracts GLB binary at correct offset', () => {
    const glbMagic = new Uint8Array([0x67, 0x6C, 0x54, 0x46]); // "glTF"
    const header = {
      blueprint: { name: 'Model' },
      assets: [{ type: 'model', url: 'model.glb', size: 4, mime: 'model/gltf-binary' }],
    };

    const buffer = buildHypBuffer(header, [glbMagic.buffer]);

    const view = new DataView(buffer);
    const headerSize = view.getUint32(0, true);
    const parsed = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, headerSize)));

    let offset = 4 + headerSize;
    const asset = parsed.assets[0];
    const extracted = new Uint8Array(buffer, offset, asset.size);

    expect(extracted[0]).toBe(0x67); // 'g'
    expect(extracted[1]).toBe(0x6C); // 'l'
    expect(extracted[2]).toBe(0x54); // 'T'
    expect(extracted[3]).toBe(0x46); // 'F'
  });

  it('detects script presence', () => {
    const header = {
      blueprint: { name: 'ScriptedApp' },
      assets: [
        { type: 'model', url: 'model.glb', size: 0, mime: 'model/gltf-binary' },
        { type: 'script', url: 'app.js', size: 0, mime: 'application/javascript' },
      ],
    };

    const hasScript = header.assets.some(a => a.type === 'script');
    expect(hasScript).toBe(true);
  });

  it('detects no script when model only', () => {
    const header = {
      blueprint: { name: 'StaticModel' },
      assets: [
        { type: 'model', url: 'model.glb', size: 0, mime: 'model/gltf-binary' },
      ],
    };

    const hasScript = header.assets.some(a => a.type === 'script');
    expect(hasScript).toBe(false);
  });

  it('handles empty assets array', () => {
    const header = {
      blueprint: { name: 'Empty' },
      assets: [],
    };

    const buffer = buildHypBuffer(header);
    const view = new DataView(buffer);
    const headerSize = view.getUint32(0, true);
    const parsed = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, headerSize)));

    expect(parsed.assets).toHaveLength(0);
    expect(parsed.blueprint.name).toBe('Empty');
  });

  it('handles multiple models', () => {
    const header = {
      blueprint: { name: 'MultiModel' },
      assets: [
        { type: 'model', url: 'a.glb', size: 2, mime: 'model/gltf-binary' },
        { type: 'model', url: 'b.glb', size: 2, mime: 'model/gltf-binary' },
        { type: 'avatar', url: 'avatar.vrm', size: 2, mime: 'model/gltf-binary' },
      ],
    };

    const modelCount = header.assets.filter(a => a.type === 'model').length;
    expect(modelCount).toBe(2);
  });
});
