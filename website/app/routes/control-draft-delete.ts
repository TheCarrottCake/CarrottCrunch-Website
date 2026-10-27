import type { Route } from './+types/control-draft-delete';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { deleteDraftAction } from '../lib/draft-delete.server';
import { studioHeaders } from '../lib/content-studio.server';
export function headers() { return studioHeaders; }
export async function action({ request, context, params }: Route.ActionArgs) {
  return deleteDraftAction(request, context.get(contentEnvironmentContext), params.draftId, import.meta.env.DEV);
}
