import { DynamoDbProductRepository, S3ImageStorage } from "@arrosticini/catalog";
import { Email } from "@arrosticini/contracts";
import { DynamoDbUserRepository } from "@arrosticini/identity";
import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { z } from "zod";
import { createDynamoDbClient, createS3Client } from "../src/aws.js";
import { seedAdmin, seedCatalog } from "./seed.js";

const PROJECT_ID = "arrosticini";
const REGION = "eu-south-1";

const Outputs = z.object({
  ProductsTableName: z.string().min(1),
  UsersTableName: z.string().min(1),
  UserEmailsTableName: z.string().min(1),
  MediaBucketName: z.string().min(1),
});

const cloudFormation = new CloudFormationClient({ region: REGION });
const ssm = new SSMClient({ region: REGION });

const { Stacks } = await cloudFormation.send(
  new DescribeStacksCommand({ StackName: `${PROJECT_ID}-app` }),
);
const outputs = Outputs.parse(
  Object.fromEntries(
    (Stacks?.[0]?.Outputs ?? []).map((output) => [output.OutputKey, output.OutputValue]),
  ),
);

async function parameter(name: string) {
  const { Parameter } = await ssm.send(
    new GetParameterCommand({ Name: `/${PROJECT_ID}/${name}`, WithDecryption: true }),
  );
  return Parameter?.Value;
}

const admin = z
  .object({ email: Email, password: z.string().min(8) })
  .parse({ email: await parameter("admin-email"), password: await parameter("admin-password") });

const dynamo = createDynamoDbClient(REGION, undefined);
const s3 = createS3Client(REGION, undefined);

await seedCatalog(
  new DynamoDbProductRepository(dynamo, outputs.ProductsTableName),
  new S3ImageStorage(s3, outputs.MediaBucketName),
);
await seedAdmin(
  new DynamoDbUserRepository(dynamo, outputs.UsersTableName, outputs.UserEmailsTableName),
  admin,
);
