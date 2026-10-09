import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/redirect.ts"),
  route(":lang", "routes/locale.tsx", [
    index("routes/welcome.tsx"),
    route("products", "routes/products.tsx"),
    route("products/:slug", "routes/product.tsx"),
    route("story", "routes/story.tsx"),
    route("delivery", "routes/delivery.tsx"),
    route("login", "routes/login.tsx"),
    route("register", "routes/register.tsx"),
    route("logout", "routes/logout.ts"),
    route("account", "routes/account.tsx"),
  ]),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
