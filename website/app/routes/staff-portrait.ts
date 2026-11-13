import type {Route} from './+types/staff-portrait';
import {contentEnvironmentContext} from '../lib/cloudflare-context.server';
import {deliverProfilePortrait} from '../lib/staff-profiles.server';
export async function loader({request,context,params}:Route.LoaderArgs){return deliverProfilePortrait(request,context.get(contentEnvironmentContext),params.profileId,params.releaseId);}
