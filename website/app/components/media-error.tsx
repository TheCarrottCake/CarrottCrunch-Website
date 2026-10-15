import { isRouteErrorResponse, Link } from 'react-router';
import { ControlShell } from './control-shell';
export function MediaErrorBoundary({error}: {error:unknown}) {
  const status=isRouteErrorResponse(error)?error.status:503;
  return <ControlShell title={status===403?'Staff access required.':status===404?'Image not found.':'Media Library unavailable.'}>
    <p>{status===403?'Sign in with an authorized staff account to access private media.':status===404?'This image could not be found.':'Local media storage or authentication may not be configured. Please try again later or contact the community Owner.'}</p>
    <Link className="button secondary" to={status===403?'/login':'/control/media'}>{status===403?'Sign In with Discord':'Back to Media Library'}</Link>
  </ControlShell>;
}
