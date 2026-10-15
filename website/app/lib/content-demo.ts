/** A server configuration flag plus the build's development mode are both required. */
export function isContentDemonstration(enabled: string | undefined, development: boolean): boolean {
  return development && enabled === 'true';
}
