import { useTranslation } from "react-i18next";
import { Form, useNavigation } from "react-router";
import type { CheckoutResult } from "../lib/ordering.server.js";
import { FormField } from "./form-field.js";
import { Button } from "./ui/button.js";

export function AddressForm({ result }: { result: CheckoutResult | undefined }) {
  const { t } = useTranslation("shop");
  const navigation = useNavigation();
  const busy: boolean = navigation.state !== "idle";
  const saving: boolean = busy && navigation.formData?.get("intent") === "address";
  return (
    <Form method="post" className="address-form" aria-busy={saving}>
      <input type="hidden" name="intent" value="address" />
      <FormField
        id="fullName"
        name="fullName"
        label={t("fullName")}
        autoComplete="shipping name"
        maxLength={100}
        required
        defaultValue={result?.values.fullName ?? ""}
        {...(result?.errors.fullName ? { error: t(result.errors.fullName) } : {})}
      />
      <FormField
        id="phone"
        name="phone"
        label={t("phone")}
        type="tel"
        autoComplete="shipping tel"
        maxLength={30}
        required
        defaultValue={result?.values.phone ?? ""}
        {...(result?.errors.phone ? { error: t(result.errors.phone) } : {})}
      />
      <FormField
        id="line1"
        name="line1"
        label={t("line1")}
        autoComplete="shipping address-line1"
        maxLength={200}
        required
        defaultValue={result?.values.line1 ?? ""}
        {...(result?.errors.line1 ? { error: t(result.errors.line1) } : {})}
      />
      <FormField
        id="line2"
        name="line2"
        label={t("line2")}
        autoComplete="shipping address-line2"
        maxLength={200}
        defaultValue={result?.values.line2 ?? ""}
        {...(result?.errors.line2 ? { error: t(result.errors.line2) } : {})}
      />
      <FormField
        id="city"
        name="city"
        label={t("city")}
        autoComplete="shipping address-level2"
        maxLength={100}
        required
        defaultValue={result?.values.city ?? ""}
        {...(result?.errors.city ? { error: t(result.errors.city) } : {})}
      />
      <FormField
        id="postalCode"
        name="postalCode"
        label={t("postalCode")}
        autoComplete="shipping postal-code"
        maxLength={20}
        required
        defaultValue={result?.values.postalCode ?? ""}
        {...(result?.errors.postalCode ? { error: t(result.errors.postalCode) } : {})}
      />
      <FormField
        id="country"
        name="country"
        label={t("country")}
        autoComplete="shipping country"
        maxLength={2}
        minLength={2}
        required
        defaultValue={result?.values.country || "IT"}
        hint={t("countryHint")}
        {...(result?.errors.country ? { error: t(result.errors.country) } : {})}
      />
      <Button type="submit" busy={busy}>
        {t(saving ? "savingAddress" : "saveAddress")}
      </Button>
    </Form>
  );
}
