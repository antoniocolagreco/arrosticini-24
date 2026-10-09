import type { AddressDto, ShippingAddressDto } from "@arrosticini/contracts";
import { useTranslation } from "react-i18next";

export function AddressCard({
  address,
  selected = false,
  choose = false,
}: {
  address: AddressDto | ShippingAddressDto;
  selected?: boolean;
  choose?: boolean;
}) {
  const { t, i18n } = useTranslation("shop");
  const content = (
    <>
      <strong>{address.fullName}</strong>
      <span>{address.line1}</span>
      {address.line2 && <span>{address.line2}</span>}
      <span>
        {address.postalCode} {address.city}
      </span>
      <span>{address.phone}</span>
      <span>{new Intl.DisplayNames([i18n.language], { type: "region" }).of(address.country)}</span>
    </>
  );
  if (choose && "id" in address)
    return (
      <label className="address-card address-choice">
        <input
          type="radio"
          name="addressId"
          value={address.id}
          defaultChecked={selected}
          required
        />
        <div>
          {address.isDefault && (
            <span className="status-badge address-default">{t("defaultAddress")}</span>
          )}
          {content}
        </div>
      </label>
    );
  return <address className="address-card">{content}</address>;
}
