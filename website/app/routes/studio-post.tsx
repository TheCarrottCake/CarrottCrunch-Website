import type { Route } from './+types/studio-post';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { studioEditorLoader, studioEditorAction } from '../lib/studio-route.server';
import { studioHeaders, studioSession, studioFailure } from '../lib/content-studio.server';
import { studioGet } from '../lib/studio.server';
import { ControlDashboard } from '../components/control-dashboard';
import { StudioEditor } from '../components/studio-editor';
export { StudioErrorBoundary as ErrorBoundary } from '../components/studio-error';
export function headers() { return studioHeaders; }
export function loader({ request, context, params }: Route.LoaderArgs) { return studioEditorLoader(request, context.get(contentEnvironmentContext), params.documentId, 'announcement', import.meta.env.DEV); }
export async function action({ request, context, params }: Route.ActionArgs) { try {
    const env = context.get(contentEnvironmentContext), { db } = await studioSession(request, env, true, import.meta.env.DEV), { document } = await studioGet(db, params.documentId);
    return studioEditorAction(request, env, params.documentId, document.kind, import.meta.env.DEV);
}
catch (e) {
    throw studioFailure(e);
} }
export default function StudioPost({ loaderData: d, actionData }: Route.ComponentProps) { return <ControlDashboard {...d} section="Posts & Events"><StudioEditor key={JSON.stringify(actionData || `${d.document?.id}:${d.document?.version}`)} {...d} snapshot={actionData?.snapshot || d.snapshot} images={actionData?.images || d.images} message={actionData?.message}/></ControlDashboard>; }
