import { type RefObject, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Form, Link, useNavigation } from "react-router";
import type { AuthResult } from "../lib/auth.server.js";
import { Breadcrumb } from "./breadcrumb.js";
import { FormAlert } from "./form-alert.js";
import { FormField } from "./form-field.js";
import { Button } from "./ui/button.js";

export function AuthForm({ register, result }: { register: boolean; result?: AuthResult }) {
  const { t, i18n } = useTranslation("account");
  const navigation: ReturnType<typeof useNavigation> = useNavigation();
  const pending: boolean = navigation.state !== "idle";
  const form: RefObject<HTMLFormElement | null> = useRef<HTMLFormElement>(null);
  const title: string = t(register ? "register" : "login");
  useEffect(() => {
    if (result)
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
  }, [result]);
  return (
    <section className="account-page shell">
      <Breadcrumb items={[{ label: title }]} />
      <div className="auth-panel">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{title}</h1>
        <p className="account-intro">{t(register ? "registerIntro" : "loginIntro")}</p>
        <Form method="post" ref={form} noValidate>
          {result?.error && <FormAlert message={t(result.error)} />}
          <FormField
            id="username"
            name="username"
            label={t("username")}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={32}
            defaultValue={result?.values.username}
            hint={t("usernameHint")}
            {...(result?.errors.username ? { error: t(result.errors.username) } : {})}
          />
          <FormField
            id="password"
            name="password"
            label={t("password")}
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
            maxLength={128}
            {...(register ? { hint: t("passwordHint"), minLength: 8 } : {})}
            {...(result?.errors.password ? { error: t(result.errors.password) } : {})}
          />
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {t(pending ? "submitting" : register ? "createAccount" : "login")}
          </Button>
        </Form>
        <p className="auth-alternative">
          {t(register ? "alreadyRegistered" : "noAccount")}{" "}
          <Link to={`/${i18n.language}/${register ? "login" : "register"}`}>
            {t(register ? "login" : "register")}
          </Link>
        </p>
      </div>
    </section>
  );
}
