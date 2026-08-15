/**
 * Inspector island — a minimal single-triangle GLB is built in-test (no
 * binaries in git) and fed through the file input; the island must render
 * it and report correct graph statistics. Files never leave the browser.
 */

import { test, expect } from '@playwright/test';

/** Build the smallest valid GLB: one mesh, one triangle, no materials. */
function buildTriangleGlb(): Buffer {
  const positions = Buffer.alloc(36);
  const vertices = [0, 0, 0, 1, 0, 0, 0, 1, 0];
  vertices.forEach((value, i) => positions.writeFloatLE(value, i * 4));

  const json = JSON.stringify({
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: 'VEC3',
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
    ],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    buffers: [{ byteLength: 36 }],
  });
  const jsonPadded = Buffer.from(json + ' '.repeat((4 - (json.length % 4)) % 4));
  const binPadded = positions; // 36 bytes, already 4-aligned

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // magic 'glTF'
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binPadded.length, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonPadded.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binPadded.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

  return Buffer.concat([header, jsonHeader, jsonPadded, binHeader, binPadded]);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/inspector/');
  await page.waitForSelector('[data-inspector]');
});

test('renders a local GLB and reports its statistics', async ({ page }) => {
  await page.locator('[data-inspector] input[type="file"]').setInputFiles({
    name: 'triangle.glb',
    mimeType: 'model/gltf-binary',
    buffer: buildTriangleGlb(),
  });
  await expect(page.locator('[data-inspector]')).toHaveAttribute('data-inspector-status', 'ready', {
    timeout: 15_000,
  });
  await expect(page.locator('[data-inspector] canvas')).toBeVisible();
  const stats = page.locator('[data-inspector-stats]');
  await expect(stats).toContainText('triangle.glb');
  const rows = stats.locator('.row');
  await expect(rows.nth(2)).toContainText('1'); // meshes
  await expect(rows.nth(4)).toContainText('1'); // triangles
});

test('rejects unsupported files without leaving the page', async ({ page }) => {
  await page.locator('[data-inspector] input[type="file"]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a model'),
  });
  await expect(page.locator('[data-inspector-unsupported]')).toBeVisible();
  await expect(page.locator('[data-inspector] canvas')).toHaveCount(0);
});

test('surfaces a load error for corrupt models', async ({ page }) => {
  await page.locator('[data-inspector] input[type="file"]').setInputFiles({
    name: 'broken.glb',
    mimeType: 'model/gltf-binary',
    buffer: Buffer.from('glTF-but-not-really'),
  });
  await expect(page.locator('[data-inspector-error]')).toBeVisible({ timeout: 15_000 });
});
