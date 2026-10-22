import type {
  CreateTableCommandInput,
  UpdateTimeToLiveCommandInput,
} from "@aws-sdk/client-dynamodb";

export function stripeEventsTableDefinition(tableName: string): CreateTableCommandInput {
  return {
    TableName: tableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [{ AttributeName: "eventId", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "eventId", KeyType: "HASH" }],
  };
}

export function stripeEventsTimeToLive(tableName: string): UpdateTimeToLiveCommandInput {
  return {
    TableName: tableName,
    TimeToLiveSpecification: { AttributeName: "ttl", Enabled: true },
  };
}
