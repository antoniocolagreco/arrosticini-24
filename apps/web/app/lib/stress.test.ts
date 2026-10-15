import type { WhoAmIDto } from "@arrosticini/contracts";
import { describe, expect, it } from "vitest";
import { StressStatus, type StressTask, sheepState, updateStressTasks } from "./stress.js";

describe("stress task discovery", () => {
  it("retains alternating tasks and separates services with the same local hostname", () => {
    const first: WhoAmIDto[] = [
      {
        service: "web",
        version: "v1",
        taskId: "local",
        availabilityZone: "local",
        cpuPercent: 20,
        startedAt: "2026-10-09T12:00:00Z",
      },
      {
        service: "api",
        version: "v1",
        taskId: "local",
        availabilityZone: "local",
        cpuPercent: 30,
        startedAt: "2026-10-09T12:00:00Z",
      },
    ];
    const second: WhoAmIDto[] = [
      {
        service: "web",
        version: "v2",
        taskId: "web-2",
        availabilityZone: "eu-south-1b",
        cpuPercent: 90,
        startedAt: "2026-10-09T13:00:00Z",
      },
      {
        service: "api",
        version: "v2",
        taskId: "api-2",
        availabilityZone: "eu-south-1b",
        cpuPercent: 70,
        startedAt: "2026-10-09T13:00:00Z",
      },
    ];
    const tasks: StressTask[] = updateStressTasks(updateStressTasks([], first, 0), second, 500);
    expect(tasks).toHaveLength(4);
    expect(tasks.map((task) => `${task.service}:${task.taskId}`)).toEqual([
      "web:local",
      "api:local",
      "web:web-2",
      "api:api-2",
    ]);
    expect(tasks.map((task) => task.lastSeen)).toEqual([0, 0, 500, 500]);
  });

  it("replaces a reading without duplicating the task and resets its expiry", () => {
    const previous: StressTask[] = [
      {
        service: "api",
        version: "v1",
        taskId: "api-1",
        availabilityZone: "eu-south-1a",
        cpuPercent: 90,
        startedAt: "2026-10-09T12:00:00Z",
        lastSeen: 0,
      },
    ];
    const readings: WhoAmIDto[] = [
      {
        service: "api",
        version: "v2",
        taskId: "api-1",
        availabilityZone: "eu-south-1a",
        cpuPercent: 20,
        startedAt: "2026-10-09T13:00:00Z",
      },
    ];
    const tasks: StressTask[] = updateStressTasks(previous, readings, 16000);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ version: "v2", cpuPercent: 20, lastSeen: 16000 });
    expect(previous[0]?.lastSeen).toBe(0);
  });

  it("turns a silent task into a ghost at five seconds and removes it at fifteen", () => {
    const task: StressTask = {
      service: "web",
      version: "v1",
      taskId: "web-1",
      availabilityZone: "eu-south-1a",
      cpuPercent: 10,
      startedAt: "2026-10-09T12:00:00Z",
      lastSeen: 0,
    };
    expect(sheepState(task, 4999)).toBe("calm");
    expect(sheepState(task, 5000)).toBe("ghost");
    expect(updateStressTasks([task], [], 14999)).toEqual([task]);
    expect(updateStressTasks([task], [], 15000)).toEqual([]);
  });

  it.each([79.9, 80, 100])(
    "uses the inclusive 80 percent overdrive threshold at %i",
    (cpuPercent) => {
      const task: StressTask = {
        service: "api",
        version: "v1",
        taskId: "api-1",
        availabilityZone: "local",
        cpuPercent,
        startedAt: "2026-10-09T12:00:00Z",
        lastSeen: 0,
      };
      expect(sheepState(task, 0)).toBe(cpuPercent < 80 ? "calm" : "overdrive");
      expect(sheepState(task, 5000)).toBe("ghost");
    },
  );

  it("accepts a partial outage but rejects swapped service identities", () => {
    const status: unknown = {
      web: {
        service: "web",
        version: "dev",
        taskId: "local",
        availabilityZone: "local",
        cpuPercent: 10,
        startedAt: "2026-10-09T12:00:00Z",
      },
      api: null,
    };
    expect(StressStatus.safeParse(status).success).toBe(true);
    expect(
      StressStatus.safeParse({
        web: {
          service: "api",
          version: "dev",
          taskId: "local",
          availabilityZone: "local",
          cpuPercent: 10,
          startedAt: "2026-10-09T12:00:00Z",
        },
        api: null,
      }).success,
    ).toBe(false);
  });
});
