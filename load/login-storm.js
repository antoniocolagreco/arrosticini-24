import { check } from "k6";
import http from "k6/http";

const baseUrl = __ENV.BASE_URL ?? "http://localhost:3100";
const email = __ENV.EMAIL;
const vus = Number(__ENV.VUS ?? 20);
const duration = __ENV.DURATION ?? "5m";

if (email === undefined) {
  throw new Error("Set EMAIL to a registered account, for example -e EMAIL=admin@example.com");
}

export const options = {
  scenarios: {
    loginStorm: {
      executor: "constant-vus",
      vus,
      duration,
    },
  },
  thresholds: {
    "http_req_duration{expected_response:true}": ["p(95)<5000"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const response = http.post(
    `${baseUrl}/it/login`,
    { email, password: "not-the-password-of-this-account" },
    {
      headers: { Origin: baseUrl },
      responseCallback: http.expectedStatuses({ min: 200, max: 499 }),
    },
  );
  check(response, { "no server error": ({ status }) => status < 500 });
}
