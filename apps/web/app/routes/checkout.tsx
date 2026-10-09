import { MAX_ADDRESSES_PER_USER } from "@arrosticini/contracts";
import { CreditCard, MapPin, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, Link, redirect, useNavigation } from "react-router";
import { AddressChoice } from "../components/address-card.js";
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
  const failedAddress: boolean = actionData?.kind === "address";
  const full: boolean = loaderData.addresses.length >= MAX_ADDRESSES_PER_USER;
  const [showAddress, setShowAddress] = useState<boolean>(failedAddress);
  useEffect(() => {
    setShowAddress(false);
  }, [loaderData.addresses.length]);
  useEffect(() => {
    if (failedAddress) setShowAddress(true);
  }, [failedAddress]);
  useEffect(() => {
    if (showAddress) document.getElementById("address-fullName")?.focus();
  }, [showAddress]);
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
        <div className="checkout-main">
          <Form method="post" id="place-order" aria-busy={placingOrder}>
            <input type="hidden" name="intent" value="order" />
            <fieldset className="address-picker">
              <legend className="section-title">{t("shippingAddress")}</legend>
              {loaderData.addresses.length > 0 && (
                <div className="tile-grid">
                  {loaderData.addresses.map((address) => (
                    <AddressChoice key={address.id} address={address} />
                  ))}
                  <button
                    type="button"
                    className="tile-add"
                    disabled={busy || full || showAddress}
                    onClick={() => setShowAddress(true)}
                  >
                    {full ? (
                      <MapPin size={20} aria-hidden="true" />
                    ) : (
                      <Plus size={20} aria-hidden="true" />
                    )}
                    <b>{t("anotherAddress")}</b>
                    <span className="tile-add-hint">
                      {t(full ? "addressSlotsFull" : "addressSlots", {
                        count: loaderData.addresses.length,
                        max: MAX_ADDRESSES_PER_USER,
                      })}
                    </span>
                  </button>
                </div>
              )}
            </fieldset>
          </Form>
          {full && (
            <Link className="checkout-back" to={`/${locale}/account/addresses`}>
              {t("manageAddresses")}
            </Link>
          )}
          {(loaderData.addresses.length === 0 || showAddress) && (
            <AddressForm
              title={t("newAddress")}
              intent="address"
              result={failedAddress ? actionData : undefined}
              {...(loaderData.addresses.length ? { onCancel: () => setShowAddress(false) } : {})}
            />
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
