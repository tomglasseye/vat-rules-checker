import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("api/vies", "routes/api.vies.ts"),

  // Signed-in area
  layout("routes/app-layout.tsx", [
    route("check", "routes/check.tsx"),
    route("history", "routes/history.tsx"),
    route("history/:checkId", "routes/history-detail.tsx"),
    route("switch-client", "routes/switch-client.ts"),

    // PVM admins only
    ...prefix("admin", [
      layout("routes/admin/layout.tsx", [
        index("routes/admin/clients.tsx"),
        route("rates", "routes/admin/rates.tsx"),
        route("clients/:slug", "routes/admin/client-layout.tsx", [
          index("routes/admin/client-rules.tsx"),
          route("try", "routes/admin/client-try.tsx"),
          route("versions", "routes/admin/client-versions.tsx"),
          route("users", "routes/admin/client-users.tsx"),
        ]),
      ]),
    ]),
  ]),
] satisfies RouteConfig;
