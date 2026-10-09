import type { AddressDto, ShippingAddressDto } from "@arrosticini/contracts";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Form, useNavigation } from "react-router";

function AddressLines({ address }: { address: AddressDto | ShippingAddressDto }) {
  const { t, i18n } = useTranslation("shop");
  return (
    <>
      <div className="tile-head">
        <strong>{address.fullName}</strong>
        {"isDefault" in address && address.isDefault && (
          <span className="status-badge status-default">{t("defaultAddress")}</span>
        )}
      </div>
      <address>
        {address.line1}
        {address.line2 && (
          <>
            <br />
            {address.line2}
          </>
        )}
        <br />
        {address.postalCode} {address.city}
        <br />
        {new Intl.DisplayNames([i18n.language], { type: "region" }).of(address.country)}
      </address>
      <p className="tile-meta">{address.phone}</p>
    </>
  );
}

export function AddressCard({ address }: { address: ShippingAddressDto }) {
  return (
    <div className="address-view">
      <AddressLines address={address} />
    </div>
  );
}

export function AddressChoice({ address }: { address: AddressDto }) {
  return (
    <label className="tile tile-choice">
      <input
        type="radio"
        name="addressId"
        value={address.id}
        defaultChecked={address.isDefault}
        required
      />
      <AddressLines address={address} />
    </label>
  );
}

export function ManagedAddress({ address, onEdit }: { address: AddressDto; onEdit: () => void }) {
  const { t } = useTranslation("shop");
  const navigation = useNavigation();
  const busy: boolean = navigation.state !== "idle";
  return (
    <li className="tile">
      <AddressLines address={address} />
      <div className="tile-actions">
        {!address.isDefault && (
          <Form method="post">
            <input type="hidden" name="intent" value="default" />
            <input type="hidden" name="id" value={address.id} />
            <button
              type="submit"
              className="tile-link"
              disabled={busy}
              aria-label={t("makeDefaultLabel", { name: address.fullName })}
            >
              {t("makeDefault")}
            </button>
          </Form>
        )}
        <div className="tile-icons">
          <button
            type="button"
            className="icon-action"
            onClick={onEdit}
            disabled={busy}
            title={t("editAddress")}
            aria-label={t("editAddressLabel", { name: address.fullName })}
          >
            <Pencil size={20} aria-hidden="true" />
          </button>
          {!address.isDefault && (
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="id" value={address.id} />
              <button
                type="submit"
                className="icon-action icon-action-danger"
                disabled={busy}
                title={t("removeAddress")}
                aria-label={t("removeAddressLabel", { name: address.fullName })}
              >
                <Trash2 size={20} aria-hidden="true" />
              </button>
            </Form>
          )}
        </div>
      </div>
    </li>
  );
}
