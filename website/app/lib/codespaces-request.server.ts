import { authConfiguration, type AuthEnvironment } from './staff-auth.server.ts';

/** Codespaces terminates HTTPS and forwards to Vite on loopback with the original host in a header. */
export function codespacesDevelopmentRequest(request: Request, env: AuthEnvironment, development = false): Request {
  if (!development) return request;
  try {
    const incoming = new URL(request.url);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(incoming.hostname) || !incoming.port) return request;
    const config = authConfiguration(env, true);
    const configured = new URL(config.origin);
    // The configured origin is the sole allowlist; headers never select a destination.
    // Restrict this exception to this port's Codespaces HTTPS origin and local transport.
    if (!config.secure || configured.port || !configured.hostname.endsWith(`-${incoming.port}.app.github.dev`) ||
        request.headers.get('X-Forwarded-Host') !== configured.host ||
        request.headers.get('X-Forwarded-Proto') !== 'https') return request;
    const corrected = new URL(incoming);
    // Assign origin fields explicitly so even a path beginning // stays a path.
    corrected.protocol = configured.protocol;
    corrected.hostname = configured.hostname;
    corrected.port = configured.port;
    return new Request(corrected, request);
  } catch {
    return request;
  }
}
