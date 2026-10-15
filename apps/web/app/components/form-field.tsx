import { ChevronDown, CircleAlert } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils.js";

export function SelectField({
  label,
  error,
  id,
  className,
  children,
  ...props
}: ComponentProps<"select"> & { id: string; label: string; error?: string }) {
  return (
    <div className={cn("form-field", className)}>
      <label htmlFor={id}>{label}</label>
      <span className="form-select">
        <select
          {...props}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-message` : undefined}
        >
          {children}
        </select>
        <ChevronDown className="form-select-icon" size={20} aria-hidden="true" />
      </span>
      {error && (
        <p id={`${id}-message`} className="field-error">
          <CircleAlert size={16} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function FormField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: ComponentProps<"input"> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <div className={cn("form-field", className)}>
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-message` : undefined}
      />
      {(error || hint) && (
        <p id={`${id}-message`} className={error ? "field-error" : "field-hint"}>
          {error && <CircleAlert size={16} aria-hidden="true" />}
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
