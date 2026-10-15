import { App } from "aws-cdk-lib";
import { ArrosticiniFoundationStack } from "../lib/foundation-stack.js";

const PROJECT_ID = "arrosticini";
const ACCOUNT = process.env.CDK_DEFAULT_ACCOUNT;
const REGION = "eu-south-1";

const PROJECT_REPOSITORY_PATH = "antoniocolagreco@92807691/arrosticini-24@1409068596";
const APPS_NAME = ["api", "web"];

if (!ACCOUNT) throw new Error("Account not found!");

const app = new App();
new ArrosticiniFoundationStack(app, `${PROJECT_ID}-foundation`, {
  projectId: PROJECT_ID,
  repositoryPath: PROJECT_REPOSITORY_PATH,
  appsName: APPS_NAME,
  env: { account: ACCOUNT, region: REGION },
});
