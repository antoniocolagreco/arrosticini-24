import { describe, expect, it } from "vitest";
import { CpuSampler } from "./cpu.js";
import { createWhoAmI } from "./whoami.js";

describe("createWhoAmI", () => {
  it("describes the task with its current CPU", async () => {
    const readings = [
      { usageMicros: 0, cores: 1 },
      { usageMicros: 500_000, cores: 1 },
    ];
    const cpu = new CpuSampler(async () => readings.shift() ?? { usageMicros: 0, cores: 1 });
    const whoami = createWhoAmI({
      service: "api",
      version: "v1.2.0",
      task: { taskId: "4f1c2b9e8d7a4e3f9a1b", availabilityZone: "eu-south-1a" },
      cpu,
      startedAt: new Date("2026-10-09T10:00:00.000Z"),
    });

    await cpu.sample(0);
    await cpu.sample(1_000);

    expect(whoami()).toEqual({
      service: "api",
      version: "v1.2.0",
      taskId: "4f1c2b9e8d7a4e3f9a1b",
      availabilityZone: "eu-south-1a",
      cpuPercent: 50,
      startedAt: "2026-10-09T10:00:00.000Z",
    });
  });
});
