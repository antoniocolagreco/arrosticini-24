import { data } from "react-router";
import { ErrorPage } from "../components/error-page.js";

export function loader() {
  return data(null, { status: 404 });
}

export default function NotFound() {
  return <ErrorPage status={404} />;
}
