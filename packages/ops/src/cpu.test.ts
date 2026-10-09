import { describe, expect, it } from "vitest";
import { type CpuReading, CpuSampler, createCpuReader, readContainerCpu } from "./cpu.js";

function files(contents: Record<string, string>) {
  return async (path: string) => contents[path];
}

describe("readContainerCpu", () => {
  it("reads usage and CPU limit from cgroup v2 inside a container", async () => {
    const reading = await readContainerCpu(
      files({
        "/proc/self/cgroup": "0::/\n",
        "/sys/fs/cgroup/cpu.stat": "usage_usec 1500000\nuser_usec 1000000\nsystem_usec 500000\n",
        "/sys/fs/cgroup/cpu.max": "25000 100000\n",
      }),
    );

    expect(reading).toEqual({ usageMicros: 1_500_000, cores: 0.25 });
  });

  it("counts one core when cgroup v2 has no CPU limit", async () => {
    const reading = await readContainerCpu(
      files({
        "/proc/self/cgroup": "0::/\n",
        "/sys/fs/cgroup/cpu.stat": "usage_usec 42\n",
        "/sys/fs/cgroup/cpu.max": "max 100000\n",
      }),
    );

    expect(reading).toEqual({ usageMicros: 42, cores: 1 });
  });

  it("reads usage and CPU limit from cgroup v1", async () => {
    const reading = await readContainerCpu(
      files({
        "/sys/fs/cgroup/cpuacct/cpuacct.usage": "3000000000\n",
        "/sys/fs/cgroup/cpu/cpu.cfs_quota_us": "50000\n",
        "/sys/fs/cgroup/cpu/cpu.cfs_period_us": "100000\n",
      }),
    );

    expect(reading).toEqual({ usageMicros: 3_000_000, cores: 0.5 });
  });

  it("ignores the host cgroup outside a container", async () => {
    const reading = await readContainerCpu(
      files({
        "/proc/self/cgroup": "0::/user.slice/user-1000.slice/session-2.scope\n",
        "/sys/fs/cgroup/cpu.stat": "usage_usec 999999999\n",
      }),
    );

    expect(reading).toBeUndefined();
  });
});

describe("createCpuReader", () => {
  it("falls back to the CPU time of the process on one core", async () => {
    const reading = await createCpuReader(files({}))();

    expect(reading.cores).toBe(1);
    expect(reading.usageMicros).toBeGreaterThan(0);
  });
});

describe("CpuSampler", () => {
  function sampler(readings: CpuReading[]) {
    return new CpuSampler(async () => readings.shift() ?? { usageMicros: 0, cores: 1 });
  }

  it("reports the share of the CPU limit used since the previous sample", async () => {
    const cpu = sampler([
      { usageMicros: 1_000_000, cores: 0.25 },
      { usageMicros: 1_200_000, cores: 0.25 },
    ]);

    await cpu.sample(10_000);
    expect(cpu.percent).toBe(0);

    await cpu.sample(11_000);
    expect(cpu.percent).toBe(80);
  });

  it("caps the value at 100", async () => {
    const cpu = sampler([
      { usageMicros: 0, cores: 0.25 },
      { usageMicros: 900_000, cores: 0.25 },
    ]);

    await cpu.sample(0);
    await cpu.sample(1_000);

    expect(cpu.percent).toBe(100);
  });
});
