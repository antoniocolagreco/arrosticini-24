import { oc } from "@orpc/contract";
import { z } from "zod";

export const WhoAmIDto = z.object({
  service: z.enum(["web", "api"]),
  version: z.string(),
  taskId: z.string(),
  availabilityZone: z.string(),
  cpuPercent: z.number().min(0).max(100),
  startedAt: z.iso.datetime(),
});

export type WhoAmIDto = z.infer<typeof WhoAmIDto>;

export const whoami = oc.route({ method: "GET", path: "/internal/whoami" }).output(WhoAmIDto);

export const opsContract = {
  whoami,
};
