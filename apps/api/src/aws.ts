import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function createS3Client(region: string, endpoint: string | undefined) {
  return new S3Client({
    region,
    ...(endpoint === undefined ? {} : { endpoint, forcePathStyle: true }),
  });
}

export function createDynamoDbClient(region: string, endpoint: string | undefined) {
  return DynamoDBDocumentClient.from(
    new DynamoDBClient({ region, ...(endpoint === undefined ? {} : { endpoint }) }),
    { marshallOptions: { removeUndefinedValues: true } },
  );
}
