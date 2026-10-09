import { MAX_ADDRESSES_PER_USER } from "@arrosticini/contracts";
import { CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, Link, redirect, useNavigation } from "react-router";
import { AddressCard } from "../components/address-card.js";
import { AddressForm } from "../components/address-form.js";
import { Breadcrumb } from "../components/breadcrumb.js";
import { CartSummary } from "../components/cart-summary.js";
import { FormAlert } from "../components/form-alert.js";
import { Button } from "../components/ui/button.js";
import { api } from "../lib/api.server.js";
import { cartProducts, cartTotal, readCart } from "../lib/cart.server.js";
import { checkoutAction } from "../lib/ordering.server.js";
import { requireUser } from "../lib/session.server.js";
import type { Route } from "./+types/checkout.js";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = requireUser(context, params.lang);
  const cart = await readCart(request, context);
  if (!cart?.lines.length) throw redirect(`/${params.lang}/cart`);
  const [lines, addresses] = await Promise.all([
    cartProducts(request, cart),
    api(request, { userId: user.userId, role: user.role }).identity.listAddresses(),
  ]);
  return {
    lines,
    addresses: addresses.items,
    total: cartTotal(lines),
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  return checkoutAction(request, context, params.lang === "en" ? "en" : "it");
}

export default function Checkout({ loaderData, actionData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("shop");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const navigation = useNavigation();
  const busy: boolean = navigation.state !== "idle";
  const placingOrder: boolean = busy && navigation.formData?.get("intent") === "order";
  const [showAddress, setShowAddress] = useState<boolean>(false);
  useEffect(() => {
    setShowAddress(false);
  }, [loaderData.addresses.length]);
  useEffect(() => {
    if (actionData)
      document
        .querySelector<HTMLElement>(
          '.checkout-page [aria-invalid="true"],.checkout-page [role="alert"]',
        )
        ?.focus();
  }, [actionData]);
  return (
    <section className="catalog-page checkout-page">
      <Breadcrumb items={[{ label: t("cart"), to: `/${locale}/cart` }, { label: t("checkout") }]} />
      <div className="catalog-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>
          <span>{t("checkoutFirst")}</span> <span>{t("checkoutSecond")}</span>
        </h1>
      </div>
      {actionData?.error && <FormAlert message={t(actionData.error)} />}
      <div className="cart-layout">
        <div>
          <Form method="post" id="place-order" aria-busy={placingOrder}>
            <input type="hidden" name="intent" value="order" />
            <fieldset className="address-picker">
              <legend className="section-title">{t("shippingAddress")}</legend>
              <div className="address-grid">
                {loaderData.addresses.map((address) => (
                  <AddressCard
                    key={address.id}
                    address={address}
                    choose
                    selected={address.isDefault}
                  />
                ))}
              </div>
            </fieldset>
          </Form>
          {loaderData.addresses.length === 0 || showAddress || actionData?.kind === "address" ? (
            <AddressForm result={actionData?.kind === "address" ? actionData : undefined} />
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowAddress(true)}
              busy={busy}
              disabled={loaderData.addresses.length >= MAX_ADDRESSES_PER_USER}
            >
              {t("anotherAddress")}
            </Button>
          )}
          {loaderData.addresses.length >= MAX_ADDRESSES_PER_USER && (
            <p className="field-hint">{t("addressLimit")}</p>
          )}
        </div>
        <CartSummary lines={loaderData.lines} total={loaderData.total}>
          {loaderData.total === null && <FormAlert message={t("unavailableCart")} />}
          <Button
            type="submit"
            form="place-order"
            busy={busy}
            disabled={!loaderData.addresses.length || loaderData.total === null}
          >
            <CreditCard aria-hidden="true" />
            {t(placingOrder ? "placingOrder" : "placeOrder")}
          </Button>
          <p className="field-hint">{t("securePayment")}</p>
          {!loaderData.addresses.length && <p className="field-hint">{t("chooseAddress")}</p>}
          <Link className="checkout-back" to={`/${locale}/cart`}>
            {t("backToCart")}
          </Link>
        </CartSummary>
      </div>
    </section>
  );
}
