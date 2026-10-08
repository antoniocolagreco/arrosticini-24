import { GenericContainer, Wait } from "testcontainers";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    dynamodbEndpoint: string;
    valkeyUrl: string;
  }
}

export async function startDynamoDb(project: TestProject): Promise<() => Promise<void>> {
  const container = await new GenericContainer("amazon/dynamodb-local:3.3.1")
    .withCommand(["-jar", "DynamoDBLocal.jar", "-sharedDb", "-inMemory"])
    .withExposedPorts(8000)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  project.provide(
    "dynamodbEndpoint",
    `http://${container.getHost()}:${container.getMappedPort(8000)}`,
  );
  return async () => {
    await container.stop();
  };
}

export async function startValkey(project: TestProject): Promise<() => Promise<void>> {
  const container = await new GenericContainer("valkey/valkey:9.0-alpine")
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  project.provide("valkeyUrl", `redis://${container.getHost()}:${container.getMappedPort(6379)}`);
  return async () => {
    await container.stop();
  };
}
