import { startDynamoDb, startS3 } from "@arrosticini/testing";
import type { TestProject } from "vitest/node";

export default async function (project: TestProject): Promise<() => Promise<void>> {
  const stops = await Promise.all([startDynamoDb(project), startS3(project)]);
  return async () => {
    await Promise.all(stops.map((stop) => stop()));
  };
}
