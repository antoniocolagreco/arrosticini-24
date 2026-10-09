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
    route("cart", "routes/cart.tsx"),
    route("checkout", "routes/checkout.tsx"),
    route("orders", "routes/orders.tsx"),
    route("orders/:id", "routes/order.tsx"),
    route("account", "routes/account.tsx"),
    route("account/addresses", "routes/addresses.tsx"),
    route("account/payment-methods", "routes/payment-methods.tsx"),
    route("admin/products", "routes/admin-products.tsx"),
    route("admin/products/new", "routes/admin-product-new.tsx"),
    route("admin/products/:slug", "routes/admin-product.tsx"),
  ]),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
