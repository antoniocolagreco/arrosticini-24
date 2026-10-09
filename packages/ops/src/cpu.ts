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

function quotaCores(quota: number, period: number): number {
  return quota > 0 && period > 0 ? quota / period : 1;
}

export async function readContainerCpu(read: ReadText): Promise<CpuReading | undefined> {
  if ((await read("/proc/self/cgroup"))?.trim() === "0::/") {
    const usage = (await read("/sys/fs/cgroup/cpu.stat"))?.match(/^usage_usec (\d+)$/m)?.[1];
    if (usage !== undefined) {
      const [quota = "max", period = "100000"] =
        (await read("/sys/fs/cgroup/cpu.max"))?.trim().split(" ") ?? [];
      return {
        usageMicros: Number(usage),
        cores: quota === "max" ? 1 : quotaCores(Number(quota), Number(period)),
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
      ),
    };
  }
  return undefined;
}

export function createCpuReader(read: ReadText = readTextFile): () => Promise<CpuReading> {
  return async () => {
    const container = await readContainerCpu(read);
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
  #previous: { usageMicros: number; atMs: number } | undefined;
  #percent = 0;
  #timer: NodeJS.Timeout | undefined;

  constructor(read: () => Promise<CpuReading>, intervalMs = 1000) {
    this.#read = read;
    this.#intervalMs = intervalMs;
  }

  get percent(): number {
    return this.#percent;
  }

  async sample(atMs: number = performance.now()): Promise<void> {
    const { usageMicros, cores } = await this.#read();
    const previous = this.#previous;
    this.#previous = { usageMicros, atMs };
    if (previous === undefined || atMs <= previous.atMs) {
      return;
    }
    const used = (usageMicros - previous.usageMicros) / ((atMs - previous.atMs) * 1000 * cores);
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
