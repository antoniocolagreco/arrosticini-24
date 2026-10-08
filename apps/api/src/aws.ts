import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function createDynamoDbClient(region: string, endpoint: string | undefined) {
  return DynamoDBDocumentClient.from(
    new DynamoDBClient({ region, ...(endpoint === undefined ? {} : { endpoint }) }),
    { marshallOptions: { removeUndefinedValues: true } },
  );
}
