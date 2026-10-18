import { isRouteErrorResponse, Link } from 'react-router';
import { ControlShell } from './control-shell';
export function StudioErrorBoundary({ error }: { error: unknown }) {
  const status = isRouteErrorResponse(error) ? error.status : 503;
  return <ControlShell title={status === 403 ? 'Staff access required.' : status === 404 ? 'Draft not found.' : 'Content Studio unavailable.'}>
    <p>{status === 403 ? 'Sign in with a Moderator, Administrator or Owner account. If a form could not be verified, reload it before trying again.' : status === 404 ? 'This content may not be an editable draft.' : 'Check that local content migrations are applied, or contact the community Owner.'}</p>
    <Link className="button secondary" to={status === 403 ? '/login' : '/control'}>{status === 403 ? 'Sign In with Discord' : 'Back to Crunch Control'}</Link>
  </ControlShell>;
}
