import type {LegacyArgs,LegacyData} from '../lib/legacy-route-types';
namespace Route { export type LoaderArgs=LegacyArgs;export type ActionArgs=LegacyArgs;export type ComponentProps={loaderData:never;actionData?:LegacyData<Awaited<ReturnType<typeof action>>>;};export type MetaArgs={loaderData?:never};}
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { deleteDraftAction } from '../lib/draft-delete.server';
import { studioHeaders } from '../lib/content-studio.server';
export function headers() { return studioHeaders; }
export async function action({ request, context, params }: Route.ActionArgs) {
  return deleteDraftAction(request, context.get(contentEnvironmentContext), params.draftId, import.meta.env.DEV);
}
