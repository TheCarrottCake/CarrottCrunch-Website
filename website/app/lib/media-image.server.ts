/** Limits bound both request size and decoder memory in a 128 MB Worker. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 4_000_000;
export const MAX_IMAGE_SIDE = 4096;
export class MediaError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
const invalid = () => new MediaError('Upload a valid, non-animated JPEG, PNG or WebP image.');
function dimensions(width: number, height: number) {
  if (!width || !height || width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE || width * height > MAX_IMAGE_PIXELS)
    throw new MediaError('Images must be at most 4096 pixels per side and 4 million pixels in total.');
  return { width, height };
}
export function inspectImage(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new MediaError('Each image must be between 1 byte and 20 MB.', 413);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (bytes.length >= 33 && text(0, 8) === '\x89PNG\r\n\x1a\n') {
    let offset = 8, ended = false, data = false;
    const size = dimensions(view.getUint32(16), view.getUint32(20));
    if (text(12, 4) !== 'IHDR' || view.getUint32(8) !== 13) throw invalid();
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset), type = text(offset + 4, 4);
      if (length > bytes.length - offset - 12 || type === 'acTL' || type === 'fcTL' || type === 'fdAT') throw invalid();
      if (type === 'IDAT') data = true;
      offset += length + 12;
      if (type === 'IEND') { if (length !== 0) throw invalid(); ended = true; break; }
    }
    if (!ended || !data || offset !== bytes.length) throw invalid();
    return { ...size, mime: 'image/png' as const };
  }
  if (bytes.length >= 12 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
    if (view.getUint32(4, true) + 8 !== bytes.length) throw invalid();
    let offset = 12, size: { width: number; height: number } | undefined, image = false;
    while (offset + 8 <= bytes.length) {
      const kind = text(offset, 4), length = view.getUint32(offset + 4, true), start = offset + 8;
      if (length > bytes.length - start || kind === 'ANIM' || kind === 'ANMF') throw invalid();
      if (kind === 'VP8X') {
        if (length !== 10 || (bytes[start] & 2)) throw invalid();
        size = dimensions(1 + bytes[start + 4] + (bytes[start + 5] << 8) + (bytes[start + 6] << 16), 1 + bytes[start + 7] + (bytes[start + 8] << 8) + (bytes[start + 9] << 16));
      } else if (kind === 'VP8L') {
        if (length < 5 || bytes[start] !== 0x2f) throw invalid();
        const bits = view.getUint32(start + 1, true);
        const decoded = dimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
        size ??= decoded; image = true;
      } else if (kind === 'VP8 ') {
        if (length < 10 || text(start + 3, 3) !== '\x9d\x01\x2a') throw invalid();
        const decoded = dimensions(view.getUint16(start + 6, true) & 0x3fff, view.getUint16(start + 8, true) & 0x3fff);
        size ??= decoded; image = true;
      }
      offset = start + length + (length % 2);
    }
    if (!size || !image || offset !== bytes.length) throw invalid();
    return { ...size, mime: 'image/webp' as const };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    if (bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) throw invalid();
    let offset = 2, size: { width: number; height: number } | undefined;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) throw invalid();
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) throw invalid();
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        if (length < 8) throw invalid();
        size = dimensions(view.getUint16(offset + 5), view.getUint16(offset + 3));
      }
      offset += length;
    }
    if (!size) throw invalid();
    return { ...size, mime: 'image/jpeg' as const };
  }
  throw invalid();
}
/** Fully decode before accepting; freshly encoded PNG previews contain no uploaded metadata. */
export async function validateAndPreview(bytes: Uint8Array) {
  const detected = inspectImage(bytes);
  const { PhotonImage } = await import('@cf-wasm/photon');
  let image: InstanceType<typeof PhotonImage> | undefined;
  try {
    image = PhotonImage.new_from_byteslice(bytes);
    if (image.get_width() !== detected.width || image.get_height() !== detected.height) throw invalid();
    const preview = image.get_bytes();
    return { ...detected, preview };
  } catch { throw invalid(); }
  finally { image?.free(); }
}
