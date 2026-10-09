import { WhoAmIDto } from "@arrosticini/contracts";
import { z } from "zod";

export const StressStatus = z.object({
  web: WhoAmIDto.extend({ service: z.literal("web") }),
  api: WhoAmIDto.extend({ service: z.literal("api") }).nullable(),
});
export type StressStatus = z.infer<typeof StressStatus>;

export type StressTask = WhoAmIDto & { lastSeen: number };
export type SheepState = "calm" | "overdrive" | "ghost";

export function updateStressTasks(
  previous: StressTask[],
  readings: WhoAmIDto[],
  now: number,
): StressTask[] {
  const tasks: Map<string, StressTask> = new Map(
    previous.map((task) => [`${task.service}:${task.taskId}`, task]),
  );
  for (const reading of readings) {
    tasks.set(`${reading.service}:${reading.taskId}`, { ...reading, lastSeen: now });
  }
  return [...tasks.values()].filter((task) => now - task.lastSeen < 15000);
}

export function sheepState(task: StressTask, now: number): SheepState {
  if (now - task.lastSeen >= 5000) return "ghost";
  return task.cpuPercent >= 80 ? "overdrive" : "calm";
}
