/**
 * Validates file content by checking magic bytes (file signatures).
 * Prevents uploading executables renamed to .glb, etc.
 */

interface MagicSignature {
  bytes: number[];
  offset: number;
}

const SIGNATURES: Record<string, MagicSignature[]> = {
  // 3D models
  glb: [{ bytes: [0x67, 0x6C, 0x54, 0x46], offset: 0 }],  // "glTF"
  vrm: [{ bytes: [0x67, 0x6C, 0x54, 0x46], offset: 0 }],  // VRM is glTF-based
  // Images
  png: [{ bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0 }],   // PNG header
  jpg: [{ bytes: [0xFF, 0xD8, 0xFF], offset: 0 }],          // JPEG
  jpeg: [{ bytes: [0xFF, 0xD8, 0xFF], offset: 0 }],
  webp: [
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },         // "RIFF"
    { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },          // "WEBP" at offset 8
  ],
  // Audio
  mp3: [
    { bytes: [0x49, 0x44, 0x33], offset: 0 },               // ID3 tag
  ],
  ogg: [{ bytes: [0x4F, 0x67, 0x67, 0x53], offset: 0 }],   // "OggS"
  // Video
  mp4: [{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }],   // "ftyp" at offset 4
  webm: [{ bytes: [0x1A, 0x45, 0xDF, 0xA3], offset: 0 }],  // EBML header
};

// MP3 can also start with sync bytes (no ID3 tag)
const MP3_SYNC = [0xFF, 0xFB];
const MP3_SYNC2 = [0xFF, 0xF3];
const MP3_SYNC3 = [0xFF, 0xF2];

/**
 * Validate that file content matches expected format by checking magic bytes.
 * Returns true if valid, false if the content doesn't match the extension.
 *
 * For formats without signatures (HYP, STL), returns true (can't validate).
 */
export function validateMimeType(buffer: ArrayBuffer | Buffer, extension: string): boolean {
  const ext = extension.toLowerCase().replace('.', '');
  const bytes = new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer.buffer, 0, Math.min(buffer.byteLength || (buffer as Buffer).length, 16));

  if (bytes.length < 4) return false;

  // Formats we can't validate by magic bytes
  if (['hyp', 'stl', 'gif'].includes(ext)) return true;

  const sigs = SIGNATURES[ext];
  if (!sigs) return true; // Unknown format — allow

  // Check all required signatures for this format
  for (const sig of sigs) {
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (bytes[sig.offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (!match) {
      // Special case: MP3 without ID3 tag (sync bytes)
      if (ext === 'mp3') {
        const b0 = bytes[0], b1 = bytes[1];
        if ((b0 === MP3_SYNC[0] && b1 === MP3_SYNC[1]) ||
            (b0 === MP3_SYNC2[0] && b1 === MP3_SYNC2[1]) ||
            (b0 === MP3_SYNC3[0] && b1 === MP3_SYNC3[1])) {
          continue; // Valid MP3 sync
        }
      }
      return false;
    }
  }

  return true;
}
