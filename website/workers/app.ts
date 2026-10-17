import { createRequestHandler, RouterContextProvider } from "react-router";
import { contentEnvironmentContext } from "../app/lib/cloudflare-context.server";
import { codespacesDevelopmentRequest } from "../app/lib/codespaces-request.server";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const context = new RouterContextProvider();
    context.set(contentEnvironmentContext, env);
    return requestHandler(codespacesDevelopmentRequest(request, env, import.meta.env.DEV), context);
  },
} satisfies ExportedHandler<Env>;
