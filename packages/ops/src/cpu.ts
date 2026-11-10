import { readFile } from "node:fs/promises";

export interface CpuReading {
  usageMicros: number;
  cores: number;
}

export type ReadText = (path: string) => Promise<string | undefined>;

async function readTextFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

function quotaCores(quota: number, period: number, taskCpuLimit: number): number {
  return quota > 0 && period > 0 ? quota / period : taskCpuLimit;
}

export async function readContainerCpu(
  read: ReadText,
  taskCpuLimit = 1,
): Promise<CpuReading | undefined> {
  if ((await read("/proc/self/cgroup"))?.trim() === "0::/") {
    const usage = (await read("/sys/fs/cgroup/cpu.stat"))?.match(/^usage_usec (\d+)$/m)?.[1];
    if (usage !== undefined) {
      const [quota = "max", period = "100000"] =
        (await read("/sys/fs/cgroup/cpu.max"))?.trim().split(" ") ?? [];
      return {
        usageMicros: Number(usage),
        cores:
          quota === "max" ? taskCpuLimit : quotaCores(Number(quota), Number(period), taskCpuLimit),
      };
    }
  }
  const usageNanos = await read("/sys/fs/cgroup/cpuacct/cpuacct.usage");
  if (usageNanos !== undefined) {
    return {
      usageMicros: Number(usageNanos) / 1000,
      cores: quotaCores(
        Number(await read("/sys/fs/cgroup/cpu/cpu.cfs_quota_us")),
        Number(await read("/sys/fs/cgroup/cpu/cpu.cfs_period_us")),
        taskCpuLimit,
      ),
    };
  }
  return undefined;
}

export function createCpuReader(
  taskCpuLimit = 1,
  read: ReadText = readTextFile,
): () => Promise<CpuReading> {
  return async () => {
    const container = await readContainerCpu(read, taskCpuLimit);
    if (container !== undefined) {
      return container;
    }
    const { user, system } = process.cpuUsage();
    return { usageMicros: user + system, cores: 1 };
  };
}

export class CpuSampler {
  readonly #read: () => Promise<CpuReading>;
  readonly #intervalMs: number;
  readonly #windowMs: number;
  readonly #samples: { usageMicros: number; atMs: number }[] = [];
  #percent = 0;
  #timer: NodeJS.Timeout | undefined;

  constructor(read: () => Promise<CpuReading>, intervalMs = 1000, windowMs = 30_000) {
    this.#read = read;
    this.#intervalMs = intervalMs;
    this.#windowMs = windowMs;
  }

  get percent(): number {
    return this.#percent;
  }

  async sample(atMs: number = performance.now()): Promise<void> {
    const { usageMicros, cores } = await this.#read();
    const last = this.#samples.at(-1);
    if (last !== undefined && atMs <= last.atMs) {
      return;
    }
    this.#samples.push({ usageMicros, atMs });
    while (this.#samples.length > 2 && (this.#samples[1]?.atMs ?? atMs) <= atMs - this.#windowMs) {
      this.#samples.shift();
    }
    const first = this.#samples[0];
    if (first === undefined || first.atMs === atMs) {
      return;
    }
    const used = (usageMicros - first.usageMicros) / ((atMs - first.atMs) * 1000 * cores);
    this.#percent = Math.round(Math.min(Math.max(used, 0), 1) * 1000) / 10;
  }

  start(): void {
    void this.sample();
    this.#timer = setInterval(() => void this.sample(), this.#intervalMs);
    this.#timer.unref();
  }

  stop(): void {
    clearInterval(this.#timer);
  }
}
