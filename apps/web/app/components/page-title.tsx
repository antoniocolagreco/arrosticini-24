import type { ReactNode } from "react";

export function PageTitle({ first, second }: { first: ReactNode; second: ReactNode }) {
  return (
    <h1>
      <span className="page-title-first">{first}</span>{" "}
      <span className="page-title-second">{second}</span>
    </h1>
  );
}
