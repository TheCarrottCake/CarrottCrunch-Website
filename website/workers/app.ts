import { createRequestHandler, RouterContextProvider } from "react-router";
import { contentEnvironmentContext } from "../app/lib/cloudflare-context.server";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const context = new RouterContextProvider();
    context.set(contentEnvironmentContext, env);
    return requestHandler(request, context);
  },
} satisfies ExportedHandler<Env>;
