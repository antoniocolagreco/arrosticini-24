import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, useSubmit } from "react-router";

export function ProductSearch({
  query,
  loading,
  invalidSearch,
}: {
  query: string;
  loading: boolean;
  invalidSearch: boolean;
}) {
  const { t } = useTranslation("shop");
  const submit: ReturnType<typeof useSubmit> = useSubmit();
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [value, setValue] = useState<string>(query);
  const previousQuery = useRef<string>(query);

  useEffect(() => {
    const previous: string = previousQuery.current;
    previousQuery.current = query;
    setValue((current: string) =>
      current.trim() === previous || current.trim() === query ? query : current,
    );
  }, [query]);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  function search(value: string) {
    setValue(value);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void submit(value.trim() ? { q: value } : {}, {
        method: "get",
        replace: true,
        preventScrollReset: true,
      });
    }, 300);
  }

  return (
    <Form
      className="product-search"
      method="get"
      role="search"
      aria-busy={loading}
      onSubmit={() => {
        if (timer.current !== null) clearTimeout(timer.current);
      }}
    >
      <label className="sr-only" htmlFor="product-query">
        {t("searchLabel")}
      </label>
      <Search aria-hidden="true" size={20} />
      <input
        ref={input}
        id="product-query"
        name="q"
        type="search"
        value={value}
        onChange={(event) => search(event.currentTarget.value)}
        maxLength={100}
        placeholder={t("searchPlaceholder")}
        aria-invalid={invalidSearch}
        aria-describedby={invalidSearch ? "search-error" : undefined}
      />
      {value && (
        <button
          className="search-clear"
          type="button"
          aria-label={t("clearSearchLabel")}
          onClick={() => {
            search("");
            input.current?.focus();
          }}
        >
          <X aria-hidden="true" size={20} />
        </button>
      )}
    </Form>
  );
}
