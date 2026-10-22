import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

export function userEmailsTableDefinition(tableName: string): CreateTableCommandInput {
  return {
    TableName: tableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [{ AttributeName: "email", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
  };
}
