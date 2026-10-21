import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

export function productsTableDefinition(tableName: string): CreateTableCommandInput {
  return {
    TableName: tableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "slug", AttributeType: "S" },
      { AttributeName: "kind", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "priceCents", AttributeType: "N" },
    ],
    KeySchema: [{ AttributeName: "slug", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "byStatus",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
          { AttributeName: "priceCents", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "byPrice",
        KeySchema: [
          { AttributeName: "kind", KeyType: "HASH" },
          { AttributeName: "priceCents", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  };
}
