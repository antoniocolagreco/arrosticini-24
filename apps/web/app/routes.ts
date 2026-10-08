import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/redirect.ts"),
  route(":lang", "routes/locale.tsx", [
    index("routes/welcome.tsx"),
    route("story", "routes/story.tsx"),
    route("delivery", "routes/delivery.tsx"),
  ]),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
