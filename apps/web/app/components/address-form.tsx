import type { AddressDto } from "@arrosticini/contracts";
import { useTranslation } from "react-i18next";
import { Form, useNavigation } from "react-router";
import type { AddressFormResult } from "../lib/addresses.server.js";
import { COUNTRY_CODES } from "../lib/countries.js";
import { FormField, SelectField } from "./form-field.js";
import { Button } from "./ui/button.js";

export function AddressForm({
  title,
  intent,
  address,
  result,
  onCancel,
}: {
  title: string;
  intent: string;
  address?: AddressDto;
  result: AddressFormResult | undefined;
  onCancel?: () => void;
}) {
  const { t, i18n } = useTranslation("shop");
  const navigation = useNavigation();
  const busy: boolean = navigation.state !== "idle";
  const saving: boolean = busy && navigation.formData?.get("intent") === intent;
  const values: Record<string, string> = result?.values ?? {
    fullName: address?.fullName ?? "",
    phone: address?.phone ?? "",
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? "",
    city: address?.city ?? "",
    postalCode: address?.postalCode ?? "",
    country: address?.country ?? "IT",
  };
  const errors: Record<string, string> = result?.errors ?? {};
  const regions = new Intl.DisplayNames([i18n.language], { type: "region" });
  const collator = new Intl.Collator(i18n.language);
  const countries: { code: string; name: string }[] = COUNTRY_CODES.map((code) => ({
    code,
    name: regions.of(code) ?? code,
  })).sort((a, b) => collator.compare(a.name, b.name));
  const field = (name: string) => ({
    id: `address-${name}`,
    name,
    defaultValue: values[name] ?? "",
    ...(errors[name] ? { error: t(errors[name]) } : {}),
  });
  return (
    <section className="panel" aria-labelledby="address-form-title">
      <h2 id="address-form-title" className="panel-title">
        {title}
      </h2>
      <Form method="post" className="address-form" aria-busy={saving}>
        <input type="hidden" name="intent" value={intent} />
        {address && <input type="hidden" name="id" value={address.id} />}
        <FormField
          {...field("fullName")}
          label={t("fullName")}
          autoComplete="shipping name"
          placeholder="Mario Rossi"
          maxLength={100}
          required
        />
        <FormField
          {...field("phone")}
          label={t("phone")}
          type="tel"
          autoComplete="shipping tel"
          placeholder="+39 333 123 4567"
          maxLength={30}
          required
        />
        <FormField
          {...field("line1")}
          className="field-wide"
          label={t("line1")}
          autoComplete="shipping address-line1"
          placeholder="Via Roma 12"
          maxLength={200}
          required
        />
        <FormField
          {...field("line2")}
          className="field-wide"
          label={t("line2")}
          autoComplete="shipping address-line2"
          maxLength={200}
        />
        <FormField
          {...field("postalCode")}
          label={t("postalCode")}
          autoComplete="shipping postal-code"
          placeholder="66100"
          maxLength={20}
          required
        />
        <FormField
          {...field("city")}
          label={t("city")}
          autoComplete="shipping address-level2"
          placeholder="Chieti"
          maxLength={100}
          required
        />
        <SelectField {...field("country")} label={t("country")} autoComplete="shipping country">
          {countries.map(({ code, name }) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </SelectField>
        <div className="form-actions field-wide">
          <Button type="submit" busy={busy}>
            {t(saving ? "savingAddress" : "saveAddress")}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              {t("cancel")}
            </Button>
          )}
        </div>
      </Form>
    </section>
  );
}
