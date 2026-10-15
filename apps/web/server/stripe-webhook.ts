import type { RequestHandler } from "express";

export const forwardStripeWebhook: RequestHandler = async (req, res) => {
  const origin: string =
    process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? "4000"}`;
  const signature: string | undefined = req.get("stripe-signature");
  const response: Response = await fetch(new URL("/payments/webhooks/stripe", origin), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": String(req.id),
      ...(signature ? { "stripe-signature": signature } : {}),
    },
    body: new Uint8Array(req.body as Buffer),
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });
  res
    .status(response.status)
    .type(response.headers.get("content-type") ?? "application/json")
    .send(Buffer.from(await response.arrayBuffer()));
};
