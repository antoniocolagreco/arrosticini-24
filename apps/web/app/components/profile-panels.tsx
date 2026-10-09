import type { UserDto } from "@arrosticini/contracts";
import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Form, useNavigation } from "react-router";
import type { AccountResult } from "../lib/account.server.js";
import { FormField, SelectField } from "./form-field.js";
import { Button } from "./ui/button.js";

function Panel({
  id,
  title,
  editLabel,
  open,
  onEdit,
  children,
}: {
  id: string;
  title: string;
  editLabel: string;
  open: boolean;
  onEdit: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation("account");
  const navigation = useNavigation();
  return (
    <section className="panel" aria-labelledby={`${id}-title`}>
      <div className="panel-head">
        <h2 id={`${id}-title`} className="panel-title">
          {title}
        </h2>
        {!open && (
          <button
            type="button"
            className="icon-action"
            title={t("edit")}
            aria-label={editLabel}
            disabled={navigation.state !== "idle"}
            onClick={onEdit}
          >
            <Pencil size={20} aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function FormActions({
  intent,
  onCancel,
}: {
  intent: AccountResult["intent"];
  onCancel: () => void;
}) {
  const { t } = useTranslation("account");
  const navigation = useNavigation();
  const busy: boolean = navigation.state !== "idle";
  const saving: boolean = busy && navigation.formData?.get("intent") === intent;
  return (
    <div className="form-actions field-wide">
      <Button type="submit" busy={busy}>
        {t(saving ? "saving" : "save")}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
        {t("cancel")}
      </Button>
    </div>
  );
}

export function ProfilePanel({
  user,
  open,
  result,
  onEdit,
  onCancel,
}: {
  user: UserDto;
  open: boolean;
  result: AccountResult | undefined;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("account");
  const values: AccountResult["values"] = result?.values ?? user;
  const errors: Record<string, string> = result?.errors ?? {};
  const field = (name: "firstName" | "lastName" | "preferredLocale") => ({
    id: `profile-${name}`,
    name,
    defaultValue: values[name],
    ...(errors[name] ? { error: t(errors[name]) } : {}),
  });
  return (
    <Panel
      id="profile"
      title={t("profileTitle")}
      editLabel={t("editProfile")}
      open={open}
      onEdit={onEdit}
    >
      {open ? (
        <Form method="post" className="address-form">
          <input type="hidden" name="intent" value="profile" />
          <FormField
            {...field("firstName")}
            label={t("firstName")}
            autoComplete="given-name"
            maxLength={60}
            required
          />
          <FormField
            {...field("lastName")}
            label={t("lastName")}
            autoComplete="family-name"
            maxLength={60}
            required
          />
          <SelectField {...field("preferredLocale")} label={t("preferredLocale")}>
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </SelectField>
          <FormActions intent="profile" onCancel={onCancel} />
        </Form>
      ) : (
        <dl className="account-details">
          <div>
            <dt>{t("firstName")}</dt>
            <dd>{user.firstName}</dd>
          </div>
          <div>
            <dt>{t("lastName")}</dt>
            <dd>{user.lastName}</dd>
          </div>
          <div>
            <dt>{t("email")}</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>{t("preferredLocale")}</dt>
            <dd>{user.preferredLocale === "it" ? "Italiano" : "English"}</dd>
          </div>
        </dl>
      )}
    </Panel>
  );
}

export function PasswordPanel({
  email,
  open,
  result,
  onEdit,
  onCancel,
}: {
  email: string;
  open: boolean;
  result: AccountResult | undefined;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("account");
  const errors: Record<string, string> = result?.errors ?? {};
  return (
    <Panel
      id="password"
      title={t("password")}
      editLabel={t("changePassword")}
      open={open}
      onEdit={onEdit}
    >
      {open ? (
        <Form method="post" className="address-form">
          <input type="hidden" name="intent" value="password" />
          <input type="email" value={email} autoComplete="username" hidden readOnly />
          <FormField
            id="password-currentPassword"
            name="currentPassword"
            type="password"
            label={t("currentPassword")}
            autoComplete="current-password"
            maxLength={128}
            required
            {...(errors.currentPassword ? { error: t(errors.currentPassword) } : {})}
          />
          <FormField
            id="password-newPassword"
            name="newPassword"
            type="password"
            label={t("newPassword")}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            {...(errors.newPassword
              ? { error: t(errors.newPassword) }
              : { hint: t("passwordHint") })}
          />
          <FormActions intent="password" onCancel={onCancel} />
        </Form>
      ) : (
        <p className="panel-note">{t("passwordNote")}</p>
      )}
    </Panel>
  );
}
