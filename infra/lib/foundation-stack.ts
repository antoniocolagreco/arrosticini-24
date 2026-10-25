import { Stack, type StackProps } from "aws-cdk-lib";
import { Repository, TagMutability, TagStatus } from "aws-cdk-lib/aws-ecr";
import {
  OidcProviderNative,
  OpenIdConnectPrincipal,
  PolicyStatement,
  Role,
} from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

interface ArrosticiniFoundationStackProps extends StackProps {
  projectId: string;
  repositoryPath: string;
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

export class ArrosticiniFoundationStack extends Stack {
  constructor(scope: Construct, id: string, props: ArrosticiniFoundationStackProps) {
    super(scope, id, props);

    const { projectId, repositoryPath } = props;

    const repositories = ["web", "api"].map(
      (appName) =>
        new Repository(this, `${capitalize(appName)}Repository`, {
          repositoryName: `${projectId}/${appName}`,
          imageTagMutability: TagMutability.IMMUTABLE,
          lifecycleRules: [
            { tagStatus: TagStatus.TAGGED, tagPatternList: ["v*"], maxImageCount: 5 },
          ],
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
        "token.actions.githubusercontent.com:sub": `repo:${repositoryPath}:ref:refs/tags/v*`,
      },
    });

    const ciRole = new Role(this, "CiRole", {
      roleName: `${projectId}-ci`,
      assumedBy: principal,
    });

    for (const repository of repositories) {
      repository.grantPullPush(ciRole);
      repository.grant(ciRole, "ecr:DescribeImages");
    }

    ciRole.addToPolicy(
      new PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/${projectId}/repository-path`,
        ],
      }),
    );

    ciRole.addToPolicy(
      new PolicyStatement({
        actions: ["cloudformation:DescribeStacks"],
        resources: ["*"],
      }),
    );

    const policy = new PolicyStatement({
      actions: ["sts:AssumeRole"],
      resources: [`arn:aws:iam::${this.account}:role/cdk-hnb659fds-*`],
    });

    ciRole.addToPolicy(policy);
  }
}
