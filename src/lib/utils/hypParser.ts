/**
 * Parser for Hyperfy .hyp files.
 *
 * .hyp format: [4 bytes header size (Uint32LE)] [JSON header] [asset binaries...]
 *
 * The JSON header contains:
 * - blueprint: { name, model?, script?, props }
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

export interface HypParseResult {
  header: HypHeader;
  /** Extracted GLB model as a Blob URL (if found) */
  glbBlobUrl: string | null;
  /** Whether the .hyp contains scripting */
  hasScript: boolean;
  /** App name from blueprint */
  name: string;
}

/**
 * Parse a .hyp file and extract the GLB model for preview.
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

    // Extract assets from the remaining bytes
    let offset = 4 + headerSize;
    let glbBlobUrl: string | null = null;

    for (const asset of header.assets) {
      if (asset.type === 'model' && !glbBlobUrl) {
        // Extract GLB binary
        const glbData = new Uint8Array(buffer, offset, asset.size);
        const blob = new Blob([glbData], { type: 'model/gltf-binary' });
        glbBlobUrl = URL.createObjectURL(blob);
      }
      offset += asset.size;
    }

    const hasScript = header.assets.some(a => a.type === 'script');
    const name = header.blueprint?.name || 'Untitled App';

    return { header, glbBlobUrl, hasScript, name };
  } catch (error) {
    console.error('Failed to parse .hyp file:', error);
    return null;
  }
}

/**
 * Clean up blob URL created by parseHypFile.
 */
export function revokeHypBlobUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}
