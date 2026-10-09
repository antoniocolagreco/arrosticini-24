import type { CpuSampler } from "./cpu.js";
import type { TaskMetadata } from "./task-metadata.js";

export interface WhoAmI {
  service: "web" | "api";
  version: string;
  taskId: string;
  availabilityZone: string;
  cpuPercent: number;
  startedAt: string;
}

export interface WhoAmIOptions {
  service: "web" | "api";
  version: string;
  task: TaskMetadata;
  cpu: CpuSampler;
  startedAt?: Date;
}

export function createWhoAmI({
  service,
  version,
  task,
  cpu,
  startedAt = new Date(Date.now() - process.uptime() * 1000),
}: WhoAmIOptions): () => WhoAmI {
  return () => ({
    service,
    version,
    taskId: task.taskId,
    availabilityZone: task.availabilityZone,
    cpuPercent: cpu.percent,
    startedAt: startedAt.toISOString(),
  });
}
