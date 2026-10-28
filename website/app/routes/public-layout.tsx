import { useEffect, useRef } from "react";
import { data, Outlet, useLocation, useNavigation } from "react-router";
import { Footer, Header } from "../components/community";
import "../public-v3.css";

import type { Route } from "./+types/public-layout";
import { contentEnvironmentContext } from "../lib/cloudflare-context.server";
import { accountPresentation, currentSiteSession, staffCsrfToken } from "../lib/staff-auth.server";

export function headers() { return { "Cache-Control": "private, no-store", Vary: "Cookie" }; }
export function shouldRevalidate() { return true; }
export async function loader({ request, context }: Route.LoaderArgs) {
  let account = null;
  try {
    const env = context.get(contentEnvironmentContext);
    const session = await currentSiteSession(request, env, import.meta.env.DEV);
    if (session) account = { ...accountPresentation(session), csrf: await staffCsrfToken(session, env) };
  } catch { /* Missing auth never blocks anonymous public content. */ }
  return data({ account }, { headers: headers() });
}
export default function PublicLayout({ loaderData }: Route.ComponentProps) {
  const { pathname, hash } = useLocation();
  const navigation = useNavigation();
  const previousPath = useRef(pathname);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    if (previousPath.current !== pathname && !hash) main.current?.focus({ preventScroll: true });
    previousPath.current = pathname;
  }, [pathname, hash]);
  return <div className="public-v3">
    <div id="page-top" />
    <a className="skip-link" href="#main">Skip to content</a>
    <Header account={loaderData.account} />
    <div className="route-status" role="status" aria-live="polite">{navigation.state === "loading" ? "Loading page…" : ""}</div>
    <main id="main" ref={main} tabIndex={-1} aria-busy={navigation.state === "loading"}><Outlet /></main>
    <div className="container"><Footer /></div>
  </div>;
}
