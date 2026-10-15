import { hostname } from "node:os";

export interface TaskMetadata {
  taskId: string;
  availabilityZone: string;
}

interface EcsTaskResponse {
  TaskARN: string;
  AvailabilityZone: string;
}

export async function loadTaskMetadata(
  env: NodeJS.ProcessEnv,
  fetchTask: typeof fetch = fetch,
  localName: string = hostname(),
): Promise<TaskMetadata> {
  const uri = env.ECS_CONTAINER_METADATA_URI_V4;
  if (uri === undefined) {
    return { taskId: localName, availabilityZone: "local" };
  }
  const response = await fetchTask(`${uri}/task`);
  if (!response.ok) {
    throw new Error(`ECS task metadata answered ${response.status}`);
  }
  const { TaskARN, AvailabilityZone } = (await response.json()) as EcsTaskResponse;
  return { taskId: TaskARN.split("/").at(-1) ?? TaskARN, availabilityZone: AvailabilityZone };
}
