import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/public-layout.tsx", [
    index("routes/home.tsx"),
    route("community", "routes/community.tsx"),
    route("servers", "routes/servers.tsx"),
    route("gallery", "routes/gallery.tsx"),
    route("updates", "routes/updates.tsx"),
    route("updates/:announcementId", "routes/news-article.tsx"),
    route("about", "routes/about.tsx"),
    route("safety", "routes/safety.tsx"),
  ]),
  route("join", "routes/join.tsx"),
  route("control", "routes/control.tsx"),
  route("control/login", "routes/control-login.tsx"),
  route("control/auth/start", "routes/control-auth-start.ts"),
  route("control/auth/callback", "routes/control-auth-callback.ts"),
  route("control/logout", "routes/control-logout.ts"),
] satisfies RouteConfig;
