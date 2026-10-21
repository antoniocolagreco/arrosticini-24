import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

export function paymentCustomersTableDefinition(tableName: string): CreateTableCommandInput {
  return {
    TableName: tableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [{ AttributeName: "userId", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
  };
}
