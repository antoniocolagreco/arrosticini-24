import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

export function paymentsTableDefinition(tableName: string): CreateTableCommandInput {
  return {
    TableName: tableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [{ AttributeName: "orderId", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "orderId", KeyType: "HASH" }],
  };
}
