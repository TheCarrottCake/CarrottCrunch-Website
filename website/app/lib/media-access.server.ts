import { AuthError, requireStaff, requireStaffAction, staffAuthHeaders } from './staff-auth.server.ts';
import { MediaError, requireMediaStorage, type MediaEnvironment } from './media-db.server.ts';
export const mediaHeaders = { ...staffAuthHeaders, 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' };
export async function authorizeMedia(request: Request, env: MediaEnvironment, write = false, development = false) {
  try {
    const session = write ? await requireStaffAction(request,env,'Moderator',development) : await requireStaff(request,env,'Moderator',development);
    requireMediaStorage(env);
    return session;
  } catch (error) { throw mediaFailure(error); }
}
export function mediaFailure(error: unknown) {
  if (error instanceof Response) return error;
  const status = error instanceof AuthError ? error.code === 'csrf' ? 403 : error.code === 'denied' ? 403 : 503 : error instanceof MediaError ? error.status : 503;
  const message = error instanceof AuthError ? status === 403 ? 'Staff authorization and a valid same-origin request are required.' : 'Staff authentication is unavailable.' : error instanceof MediaError ? error.message : 'Media storage is unavailable. Please try again.';
  return new Response(message,{status,headers:mediaHeaders});
}
/** Bound actual streamed body size, even if Content-Length is absent or dishonest. */
export async function uploadForm(request: Request) {
  return boundedForm(request, 20 * 1024 * 1024 + 65536, 'multipart/form-data;');
}
export async function metadataForm(request: Request) {
  return boundedForm(request, 262144, 'application/x-www-form-urlencoded');
}
async function boundedForm(request: Request, maximum: number, contentType: string) {
  if (!request.headers.get('Content-Type')?.startsWith(contentType) || !request.body) throw new MediaError('Use the supplied media form.');
  const length = request.headers.get('Content-Length');
  if (length && (!/^\d+$/.test(length) || Number(length)>maximum)) throw new MediaError(contentType.startsWith('multipart') ? 'Upload exceeds the 20 MB image limit.' : 'Metadata form is too large.',413);
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximum) { await reader.cancel(); throw new MediaError(contentType.startsWith('multipart') ? 'Upload exceeds the 20 MB image limit.' : 'Metadata form is too large.',413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset=0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset+=chunk.length; }
  try { return await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')!},body:bytes}).formData(); }
  catch { throw new MediaError('The upload form is malformed.'); }
}
