import { Link } from 'react-router';
import type { Route } from './+types/studio-collection';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { studioEditorLoader, studioEditorAction } from '../lib/studio-route.server';
import { studioSession, studioHeaders, studioFailure } from '../lib/content-studio.server';
import { studioList } from '../lib/studio.server';
import type { StudioKind } from '../lib/studio-model';
import { ControlDashboard } from '../components/control-dashboard';
import { StudioEditor } from '../components/studio-editor';
export { StudioErrorBoundary as ErrorBoundary } from '../components/studio-error';
export function headers() { return studioHeaders; }
async function args(request: Request, context: Route.LoaderArgs['context'], kind: string, write = false) { try {
    if (!['homepage', 'banners', 'gallery'].includes(kind))
        throw new Response('Not found', { status: 404 });
    const env = context.get(contentEnvironmentContext), { db } = await studioSession(request, env, write, import.meta.env.DEV), rows = await studioList(db, kind);
    return { env, id: rows[0]?.id, kind: kind as StudioKind };
}
catch (e) {
    throw studioFailure(e);
} }
export async function loader({ request, context, params }: Route.LoaderArgs) { const a = await args(request, context, params.kind); return studioEditorLoader(request, a.env, a.id, a.kind, import.meta.env.DEV); }
export async function action({ request, context, params }: Route.ActionArgs) { const a = await args(request, context, params.kind, true); return studioEditorAction(request, a.env, a.id, a.kind, import.meta.env.DEV); }
export default function StudioCollection({ loaderData: d, actionData }: Route.ComponentProps) { return <ControlDashboard {...d} section={d.kind === 'gallery' ? 'Community Gallery' : 'Homepage'}>{d.kind !== 'gallery' && <nav className="studio-actions"><Link to="/control/collections/homepage">Showcase slides</Link><Link to="/control/collections/banners">Banners</Link></nav>}<StudioEditor key={JSON.stringify(actionData || `${d.document?.version}`)} {...d} snapshot={actionData?.snapshot || d.snapshot} images={actionData?.images || d.images} message={actionData?.message}/></ControlDashboard>; }
