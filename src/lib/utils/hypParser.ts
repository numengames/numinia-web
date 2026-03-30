/**
 * Parser for Hyperfy .hyp files.
 *
 * .hyp format: [4 bytes header size (Uint32LE)] [JSON header] [asset binaries...]
 *
 * The JSON header contains:
 * - blueprint: { name, model?, script?, props, frozen }
 * - assets: [{ type: "model"|"avatar"|"script", url, size, mime }]
 *
 * Assets are concatenated after the header. Each asset's binary data
 * is sliced using the `size` field from the assets array.
 */

export interface HypAsset {
  type: 'model' | 'avatar' | 'script';
  url: string;
  size: number;
  mime: string;
}

export interface HypBlueprint {
  name?: string;
  model?: string;
  script?: string;
  props?: Record<string, unknown>;
  frozen?: boolean;
}

export interface HypHeader {
  blueprint: HypBlueprint;
  assets: HypAsset[];
}

export interface HypExtractedFile {
  asset: HypAsset;
  blobUrl: string;
  text?: string; // For scripts — decoded text content
}

export interface HypParseResult {
  header: HypHeader;
  /** Extracted GLB model as a Blob URL (if found) */
  glbBlobUrl: string | null;
  /** Extracted script text (if found) */
  scriptText: string | null;
  /** All extracted files with blob URLs */
  files: HypExtractedFile[];
  /** Whether the .hyp contains scripting */
  hasScript: boolean;
  /** App name from blueprint */
  name: string;
  /** Total file size in bytes */
  totalSize: number;
}

/**
 * Parse a .hyp file and extract all assets.
 * Works client-side only (uses ArrayBuffer + Blob).
 */
export async function parseHypFile(url: string): Promise<HypParseResult | null> {
  try {
    // Fetch the .hyp file — proxy if external
    let fetchUrl = url;
    if (!url.startsWith('/') && typeof window !== 'undefined' && !url.includes(window.location.hostname)) {
      fetchUrl = `/api/proxy-asset?url=${encodeURIComponent(url)}`;
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);

    // Read header size (first 4 bytes, Uint32 Little Endian)
    if (buffer.byteLength < 4) return null;
    const headerSize = view.getUint32(0, true);

    // Read header JSON
    const headerBytes = new Uint8Array(buffer, 4, headerSize);
    const headerText = new TextDecoder().decode(headerBytes);
    const header: HypHeader = JSON.parse(headerText);

    // Extract all assets
    let offset = 4 + headerSize;
    let glbBlobUrl: string | null = null;
    let scriptText: string | null = null;
    const files: HypExtractedFile[] = [];

    for (const asset of header.assets) {
      const data = new Uint8Array(buffer, offset, asset.size);

      let blobUrl: string;
      let text: string | undefined;

      if (asset.type === 'script') {
        text = new TextDecoder().decode(data);
        blobUrl = URL.createObjectURL(new Blob([data], { type: 'application/javascript' }));
        if (!scriptText) scriptText = text;
      } else if (asset.type === 'model') {
        blobUrl = URL.createObjectURL(new Blob([data], { type: 'model/gltf-binary' }));
        if (!glbBlobUrl) glbBlobUrl = blobUrl;
      } else {
        blobUrl = URL.createObjectURL(new Blob([data], { type: asset.mime || 'application/octet-stream' }));
      }

      files.push({ asset, blobUrl, text });
      offset += asset.size;
    }

    const hasScript = header.assets.some(a => a.type === 'script');
    const name = header.blueprint?.name || 'Untitled App';

    return { header, glbBlobUrl, scriptText, files, hasScript, name, totalSize: buffer.byteLength };
  } catch (error) {
    console.error('Failed to parse .hyp file:', error);
    return null;
  }
}

/**
 * Clean up blob URLs created by parseHypFile.
 */
export function revokeHypBlobUrls(result: HypParseResult) {
  for (const f of result.files) {
    URL.revokeObjectURL(f.blobUrl);
  }
}
