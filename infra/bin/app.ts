import { App } from "aws-cdk-lib";
import { ArrosticiniFoundationStack } from "../lib/foundation-stack.js";

const PROJECT_ID = "arrosticini";
const ACCOUNT = process.env.CDK_DEFAULT_ACCOUNT;
const REGION = "eu-south-1";

if (!ACCOUNT) throw new Error("Account not found!");

const app = new App();
new ArrosticiniFoundationStack(app, `${PROJECT_ID}-foundation`, {
  projectId: PROJECT_ID,
  env: { account: ACCOUNT, region: REGION },
});
