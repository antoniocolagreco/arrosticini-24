import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

export function productsTableDefinition(tableName: string): CreateTableCommandInput {
  return {
    TableName: tableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "slug", AttributeType: "S" },
      { AttributeName: "kind", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
    ],
    KeySchema: [{ AttributeName: "slug", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "byStatus",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
          { AttributeName: "slug", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "bySlug",
        KeySchema: [
          { AttributeName: "kind", KeyType: "HASH" },
          { AttributeName: "slug", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  };
}
