import { createRequestHandler, RouterContextProvider } from "react-router";
import { contentEnvironmentContext } from "../app/lib/cloudflare-context.server";
import { codespacesDevelopmentRequest } from "../app/lib/codespaces-request.server";
import { studioSweep } from "../app/lib/studio.server";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async scheduled(_controller, env) {
    if (!env.CONTENT_DB) throw new Error('Content database is not configured for scheduling');
    const result = await studioSweep(env);
    console.info('Publication sweep', result);
    if (result.failed) throw new Error('One or more scheduled publications failed; pending releases will be retried');
  },
  async fetch(request, env) {
    const context = new RouterContextProvider();
    context.set(contentEnvironmentContext, env);
    return requestHandler(codespacesDevelopmentRequest(request, env, import.meta.env.DEV), context);
  },
} satisfies ExportedHandler<Env>;
