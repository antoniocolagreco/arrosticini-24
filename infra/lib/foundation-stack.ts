import { Stack, type StackProps } from "aws-cdk-lib";
import { Repository, TagMutability } from "aws-cdk-lib/aws-ecr";
import {
  OidcProviderNative,
  OpenIdConnectPrincipal,
  PolicyStatement,
  Role,
} from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

interface ArrosticiniFoundationStackProps extends StackProps {
  projectId: string;
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

const PROJECT_REPOSITORY_PATH = "antoniocolagreco/arrosticini-24";
const APPS_NAME = ["api", "web"];

export class ArrosticiniFoundationStack extends Stack {
  constructor(scope: Construct, id: string, props: ArrosticiniFoundationStackProps) {
    super(scope, id, props);

    const { projectId } = props;

    const repositories = APPS_NAME.map(
      (appName) =>
        new Repository(this, `${capitalize(appName)}Repository`, {
          repositoryName: `${projectId}/${appName}`,
          imageTagMutability: TagMutability.IMMUTABLE,
          lifecycleRules: [{ maxImageCount: 20 }],
        }),
    );

    const provider = new OidcProviderNative(this, "GitHub", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    const principal = new OpenIdConnectPrincipal(provider, {
      StringEquals: {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      },
      StringLike: {
        "token.actions.githubusercontent.com:sub": `repo:${PROJECT_REPOSITORY_PATH}:ref:refs/tags/v*`,
      },
    });

    const ciRole = new Role(this, "CiRole", {
      roleName: `${projectId}-ci`,
      assumedBy: principal,
    });

    for (const repository of repositories) {
      repository.grantPush(ciRole);
    }

    const policy = new PolicyStatement({
      actions: ["sts:AssumeRole"],
      resources: [`arn:aws:iam::${this.account}:role/cdk-hnb659fds-*`],
    });

    ciRole.addToPolicy(policy);
  }
}
