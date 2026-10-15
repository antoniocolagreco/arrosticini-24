import { check, sleep } from "k6";
import http from "k6/http";

const baseUrl = __ENV.BASE_URL ?? "http://localhost:3100";
const vus = Number(__ENV.VUS ?? 50);
const duration = __ENV.DURATION ?? "5m";

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: vus },
        { duration, target: vus },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
  },
};

const paths = [
  "/it",
  "/en",
  "/it/products",
  "/it/products?q=arrosticini",
  "/en/products?q=wine",
  "/it/products/arrosticini-75",
  "/en/products/fornacella",
];

export default function () {
  for (const path of paths) {
    const response = http.get(`${baseUrl}${path}`, { tags: { name: path.split("?")[0] } });
    check(response, { "status is 200": ({ status }) => status === 200 });
    sleep(1);
  }
}
