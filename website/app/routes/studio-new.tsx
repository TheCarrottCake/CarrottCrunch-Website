import type { Route } from './+types/studio-new';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { studioEditorLoader, studioEditorAction } from '../lib/studio-route.server';
import { studioHeaders } from '../lib/content-studio.server';
import { ControlDashboard } from '../components/control-dashboard';
import { StudioEditor } from '../components/studio-editor';
export { StudioErrorBoundary as ErrorBoundary } from '../components/studio-error';
export function headers() { return studioHeaders; }
export function loader({ request, context, params }: Route.LoaderArgs) { if (!['announcement', 'event'].includes(params.kind))
    throw new Response('Not found', { status: 404 }); return studioEditorLoader(request, context.get(contentEnvironmentContext), undefined, params.kind === 'event' ? 'event' : 'announcement', import.meta.env.DEV); }
export function action({ request, context, params }: Route.ActionArgs) { if (!['announcement', 'event'].includes(params.kind))
    throw new Response('Not found', { status: 404 }); return studioEditorAction(request, context.get(contentEnvironmentContext), undefined, params.kind === 'event' ? 'event' : 'announcement', import.meta.env.DEV); }
export default function StudioNew({ loaderData: d, actionData }: Route.ComponentProps) { return <ControlDashboard {...d} section="Posts & Events"><StudioEditor key={JSON.stringify(actionData || 'new')} {...d} snapshot={actionData?.snapshot || d.snapshot} images={actionData?.images || d.images} message={actionData?.message}/></ControlDashboard>; }
