import { GenericContainer, Wait } from "testcontainers";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    dynamodbEndpoint: string;
    valkeyUrl: string;
    stripeMock: { host: string; port: number };
    s3Endpoint: string;
  }
}

export const S3_TEST_CREDENTIALS = { accessKeyId: "rustfsadmin", secretAccessKey: "rustfsadmin" };

export async function startS3(project: TestProject): Promise<() => Promise<void>> {
  const container = await new GenericContainer("rustfs/rustfs:1.0.1")
    .withEnvironment({
      RUSTFS_ACCESS_KEY: S3_TEST_CREDENTIALS.accessKeyId,
      RUSTFS_SECRET_KEY: S3_TEST_CREDENTIALS.secretAccessKey,
    })
    .withExposedPorts(9000)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  project.provide("s3Endpoint", `http://${container.getHost()}:${container.getMappedPort(9000)}`);
  return async () => {
    await container.stop();
  };
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

export async function startStripeMock(project: TestProject): Promise<() => Promise<void>> {
  const container = await new GenericContainer("stripe/stripe-mock:v0.203.0")
    .withExposedPorts(12111)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  project.provide("stripeMock", {
    host: container.getHost(),
    port: container.getMappedPort(12111),
  });
  return async () => {
    await container.stop();
  };
}
