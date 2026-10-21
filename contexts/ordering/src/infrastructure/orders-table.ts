import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

export function ordersTableDefinition(tableName: string): CreateTableCommandInput {
  return {
    TableName: tableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "orderId", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "kind", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    KeySchema: [{ AttributeName: "orderId", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "byUser",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "byStatus",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "byCreatedAt",
        KeySchema: [
          { AttributeName: "kind", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  };
}
