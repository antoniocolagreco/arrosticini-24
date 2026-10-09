import { CircleAlert } from "lucide-react";
import type { ComponentProps } from "react";

export function FormField({
  label,
  hint,
  error,
  id,
  ...props
}: ComponentProps<"input"> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <div className="form-field">
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
