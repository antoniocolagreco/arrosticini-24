import { MAX_ADDRESSES_PER_USER } from "@arrosticini/contracts";
import { MapPin, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigation } from "react-router";
import { AccountLayout } from "../components/account-layout.js";
import { ManagedAddress } from "../components/address-card.js";
import { AddressForm } from "../components/address-form.js";
import { FormAlert } from "../components/form-alert.js";
import { Button } from "../components/ui/button.js";
import { addressesAction } from "../lib/addresses.server.js";
import { api } from "../lib/api.server.js";
import { customerOnlyMiddleware, requireUser } from "../lib/session.server.js";
import type { Route } from "./+types/addresses.js";

export const middleware = [customerOnlyMiddleware];

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = requireUser(context, params.lang);
  return api(request, { userId: user.userId, role: user.role }).identity.listAddresses();
}

export async function action({ request, context, params }: Route.ActionArgs) {
  return addressesAction(request, context, params.lang === "en" ? "en" : "it");
}

export default function Addresses({ loaderData, actionData }: Route.ComponentProps) {
  const { t } = useTranslation("shop");
  const navigation = useNavigation();
  const busy: boolean = navigation.state !== "idle";
  const failed: string | null =
    actionData?.intent === "add" || actionData?.intent === "update"
      ? (actionData.id ?? "new")
      : null;
  const [open, setOpen] = useState<string | null>(failed);
  const full: boolean = loaderData.items.length >= MAX_ADDRESSES_PER_USER;
  const editedAddress = loaderData.items.find((address) => address.id === open);
  useEffect(() => {
    setOpen(null);
  }, [loaderData]);
  useEffect(() => {
    if (failed) setOpen(failed);
  }, [failed]);
  useEffect(() => {
    if (open) document.getElementById("address-fullName")?.focus();
  }, [open]);
  useEffect(() => {
    if (actionData)
      document
        .querySelector<HTMLElement>(
          '.account-content [aria-invalid="true"],.account-content [role="alert"]',
        )
        ?.focus();
  }, [actionData]);
  const form = open && (
    <AddressForm
      key={open}
      title={t(editedAddress ? "editAddressTitle" : "newAddress")}
      intent={editedAddress ? "update" : "add"}
      {...(editedAddress ? { address: editedAddress } : {})}
      result={failed === open ? actionData : undefined}
      onCancel={() => setOpen(null)}
    />
  );
  return (
    <AccountLayout
      crumbs={[{ label: t("addresses") }]}
      title={t("addressesTitle")}
      intro={t("addressesIntro", { max: MAX_ADDRESSES_PER_USER })}
    >
      {actionData?.error && <FormAlert message={t(actionData.error)} />}
      {loaderData.items.length > 0 ? (
        <ul className="tile-grid">
          {loaderData.items.map((address) => (
            <ManagedAddress key={address.id} address={address} onEdit={() => setOpen(address.id)} />
          ))}
          <li>
            <button
              type="button"
              className="tile-add"
              disabled={busy || full}
              onClick={() => setOpen("new")}
            >
              {full ? (
                <MapPin size={20} aria-hidden="true" />
              ) : (
                <Plus size={20} aria-hidden="true" />
              )}
              <b>{t("addAddress")}</b>
              <span className="tile-add-hint">
                {t(full ? "addressSlotsFull" : "addressSlots", {
                  count: loaderData.items.length,
                  max: MAX_ADDRESSES_PER_USER,
                })}
              </span>
            </button>
          </li>
        </ul>
      ) : (
        !open && (
          <div className="catalog-empty">
            <img src="/images/sheep.webp" alt="" width="112" height="112" />
            <h2>{t("noAddressesTitle")}</h2>
            <p>{t("noAddresses")}</p>
            <Button type="button" onClick={() => setOpen("new")}>
              <MapPin aria-hidden="true" />
              {t("addAddress")}
            </Button>
          </div>
        )
      )}
      {form}
    </AccountLayout>
  );
}
