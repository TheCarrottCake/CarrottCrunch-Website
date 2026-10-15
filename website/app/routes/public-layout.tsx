import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigation } from "react-router";
import { Footer, Header } from "../components/community";

export default function PublicLayout() {
  const { pathname, hash } = useLocation();
  const navigation = useNavigation();
  const previousPath = useRef(pathname);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    if (previousPath.current !== pathname && !hash) main.current?.focus({ preventScroll: true });
    previousPath.current = pathname;
  }, [pathname, hash]);
  return <>
    <div id="page-top" />
    <a className="skip-link" href="#main">Skip to content</a>
    <Header />
    <div className="route-status" role="status" aria-live="polite">{navigation.state === "loading" ? "Loading page…" : ""}</div>
    <main id="main" ref={main} tabIndex={-1} aria-busy={navigation.state === "loading"}><Outlet /></main>
    <div className="container"><Footer /></div>
  </>;
}
