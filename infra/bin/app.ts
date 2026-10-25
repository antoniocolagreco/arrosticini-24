import { DescribeImagesCommand, ECRClient, RepositoryNotFoundException } from "@aws-sdk/client-ecr";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { App } from "aws-cdk-lib";
import { ArrosticiniAppStack } from "../lib/app-stack.js";
import { ArrosticiniEdgeStack } from "../lib/edge-stack.js";
import { ArrosticiniFoundationStack } from "../lib/foundation-stack.js";
import { ArrosticiniWafStack } from "../lib/waf-stack.js";

const REGION = "eu-south-1";
const PROJECT_ID = "arrosticini";
const DOMAIN_NAME = "arrosticini.colagreco.dev";
const ACCOUNT = process.env.CDK_DEFAULT_ACCOUNT;
if (!ACCOUNT) throw new Error("Account not found!");

const ssmClient = new SSMClient({ region: REGION });
const { Parameter } = await ssmClient.send(
  new GetParameterCommand({ Name: `/${PROJECT_ID}/repository-path`, WithDecryption: true }),
);
const PROJECT_REPOSITORY_PATH = Parameter?.Value;
if (!PROJECT_REPOSITORY_PATH) throw new Error("Repository not found!");

const ecrClient = new ECRClient({ region: REGION });
const webImageTags = await getImageTagsFromRepo(ecrClient, `${PROJECT_ID}/web`);
const apiImageTags = await getImageTagsFromRepo(ecrClient, `${PROJECT_ID}/api`);
const latestImageTag = webImageTags.find((tag) => apiImageTags.includes(tag));

const app = new App();

const edgeStack = new ArrosticiniEdgeStack(app, `${PROJECT_ID}-edge`, {
  env: { account: ACCOUNT, region: "us-east-1" },
  crossRegionReferences: true,
  domainName: DOMAIN_NAME,
});

new ArrosticiniFoundationStack(app, `${PROJECT_ID}-foundation`, {
  env: { account: ACCOUNT, region: REGION },
  projectId: PROJECT_ID,
  repositoryPath: PROJECT_REPOSITORY_PATH,
});

if (latestImageTag) {
  const wafStack = new ArrosticiniWafStack(app, `${PROJECT_ID}-waf`, {
    env: { account: ACCOUNT, region: "us-east-1" },
    crossRegionReferences: true,
    projectId: PROJECT_ID,
  });

  new ArrosticiniAppStack(app, `${PROJECT_ID}-app`, {
    env: { account: ACCOUNT, region: REGION },
    projectId: PROJECT_ID,
    webTagVer: latestImageTag,
    apiTagVer: latestImageTag,
    crossRegionReferences: true,
    domainName: DOMAIN_NAME,
    certificate: edgeStack.certificate,
    webAclArn: wafStack.webAclArn,
  });
}

async function getImageTagsFromRepo(client: ECRClient, repositoryName: string) {
  try {
    const { imageDetails } = await client.send(
      new DescribeImagesCommand({
        repositoryName,
        filter: { tagStatus: "TAGGED", imageStatus: "ACTIVE" },
      }),
    );

    return (imageDetails ?? [])
      .toSorted((a, b) => (b.imagePushedAt?.getTime() ?? 0) - (a.imagePushedAt?.getTime() ?? 0))
      .flatMap((image) => image.imageTags ?? []);
  } catch (error) {
    if (error instanceof RepositoryNotFoundException) return [];
    throw error;
  }
}
