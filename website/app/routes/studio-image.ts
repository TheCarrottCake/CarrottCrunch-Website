import type { Route } from './+types/studio-image';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { deliverStudioImage } from '../lib/studio-media.server';
export async function loader({ request, context, params }: Route.LoaderArgs) { try {
    return await deliverStudioImage(request, context.get(contentEnvironmentContext), params.releaseId, params.assetId, params.variant);
}
catch {
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
} }
