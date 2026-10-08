import { CircleAlert } from "lucide-react";

export function FormAlert({ message }: { message: string }) {
  return (
    <p className="form-alert" role="alert" tabIndex={-1}>
      <CircleAlert size={20} aria-hidden="true" />
      {message}
    </p>
  );
}
