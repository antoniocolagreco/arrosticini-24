import { describe, expect, it } from "vitest";
import { loadTaskMetadata } from "./task-metadata.js";

describe("loadTaskMetadata", () => {
  it("reads task id and availability zone from the ECS metadata endpoint", async () => {
    const requested: string[] = [];
    const fetchTask = (async (url: string) => {
      requested.push(url);
      return Response.json({
        TaskARN: "arn:aws:ecs:eu-south-1:123456789012:task/arrosticini/4f1c2b9e8d7a4e3f9a1b",
        AvailabilityZone: "eu-south-1b",
      });
    }) as typeof fetch;

    const metadata = await loadTaskMetadata(
      { ECS_CONTAINER_METADATA_URI_V4: "http://169.254.170.2/v4/abc" },
      fetchTask,
    );

    expect(requested).toEqual(["http://169.254.170.2/v4/abc/task"]);
    expect(metadata).toEqual({
      taskId: "4f1c2b9e8d7a4e3f9a1b",
      availabilityZone: "eu-south-1b",
    });
  });

  it("uses the host name outside ECS", async () => {
    expect(await loadTaskMetadata({}, fetch, "c0ffee123456")).toEqual({
      taskId: "c0ffee123456",
      availabilityZone: "local",
    });
  });

  it("fails when the metadata endpoint answers an error", async () => {
    const fetchTask = (async () => new Response("", { status: 500 })) as typeof fetch;

    await expect(
      loadTaskMetadata({ ECS_CONTAINER_METADATA_URI_V4: "http://169.254.170.2/v4/abc" }, fetchTask),
    ).rejects.toThrow("ECS task metadata answered 500");
  });
});
