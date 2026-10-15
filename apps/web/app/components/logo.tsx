import { Link } from "react-router";

export function Logo({ locale, size }: { locale: string; size?: "sm" }) {
  return (
    <Link
      className={size === "sm" ? "logo logo-sm" : "logo"}
      to={`/${locale}`}
      aria-label="Arrosticini 24ore, home"
    >
      <img src="/images/sheep.webp" alt="" width="100" height="100" />
      <span className="wordmark">
        <b>Arrosticini</b>
        <i>
          24ore
          <svg className="tricolore" viewBox="0 0 62 9.4" aria-hidden="true">
            <path className="g" d="M0 6.6C7 4.6 14 3.6 23 2.9L21 7C14 7.5 7 8.2 0 9z" />
            <path className="w" d="M23 2.9C29 2.4 35 2 42 1.7L40 5.7C33 6 27 6.5 21 7z" />
            <path
              className="r"
              d="M42 1.7C49 1.3 56 1 62 1C58 3 52 4.4 46 5.1C44 5.3 42 5.5 40 5.7z"
            />
          </svg>
        </i>
      </span>
    </Link>
  );
}
