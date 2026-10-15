const initialDiscordInvite = "https://discord.gg/NjBVZH4CgW";

/** Accept only HTTPS Discord invite URLs, never arbitrary redirect destinations. */
export function validateDiscordInvite(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username || url.password || url.port || url.search || url.hash ||
      !(
        (url.hostname === "discord.gg" && /^\/[A-Za-z0-9-]+$/.test(url.pathname)) ||
        (url.hostname === "discord.com" && /^\/invite\/[A-Za-z0-9-]+$/.test(url.pathname))
      )
    ) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Future site settings can replace this source; callers always receive validated data. */
async function readDiscordInviteSetting(): Promise<unknown> {
  return initialDiscordInvite;
}

export async function getDiscordInvite(): Promise<string | null> {
  return validateDiscordInvite(await readDiscordInviteSetting());
}
