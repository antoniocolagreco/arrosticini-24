import type {
  CreateTableCommandInput,
  UpdateTimeToLiveCommandInput,
} from "@aws-sdk/client-dynamodb";

export function paymentsTableDefinition(tableName: string): CreateTableCommandInput {
  return {
    TableName: tableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "PK", AttributeType: "S" },
      { AttributeName: "SK", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "PK", KeyType: "HASH" },
      { AttributeName: "SK", KeyType: "RANGE" },
    ],
  };
}

export function paymentsTimeToLive(tableName: string): UpdateTimeToLiveCommandInput {
  return {
    TableName: tableName,
    TimeToLiveSpecification: { AttributeName: "ttl", Enabled: true },
  };
}
