import { Stack, type StackProps } from "aws-cdk-lib";
import { CfnWebACL } from "aws-cdk-lib/aws-wafv2";
import type { Construct } from "constructs";

interface ArrosticiniWafStackProps extends StackProps {
  projectId: string;
}

const managedRuleGroup = (
  name: string,
  priority: number,
  ruleActionOverrides?: CfnWebACL.RuleActionOverrideProperty[],
): CfnWebACL.RuleProperty => ({
  name,
  priority,
  overrideAction: { none: {} },
  statement: { managedRuleGroupStatement: { vendorName: "AWS", name, ruleActionOverrides } },
  visibilityConfig: {
    metricName: name,
    cloudWatchMetricsEnabled: true,
    sampledRequestsEnabled: true,
  },
});

export class ArrosticiniWafStack extends Stack {
  readonly webAclArn: string;

  constructor(scope: Construct, id: string, props: ArrosticiniWafStackProps) {
    super(scope, id, props);

    const { projectId } = props;

    const webAcl = new CfnWebACL(this, "WebAcl", {
      name: `${projectId}-web-acl`,
      scope: "CLOUDFRONT",
      defaultAction: { allow: {} },
      visibilityConfig: {
        metricName: `${projectId}-web-acl`,
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
      },
      rules: [
        // HTTP Flood
        {
          name: "RateLimit",
          priority: 0,
          action: { block: {} },
          statement: { rateBasedStatement: { limit: 2000, aggregateKeyType: "IP" } },
          visibilityConfig: {
            metricName: "RateLimit",
            cloudWatchMetricsEnabled: true,
            sampledRequestsEnabled: true,
          },
        },
        // Blocca gli IP che Amazon ha già visto comportarsi male
        managedRuleGroup("AWSManagedRulesAmazonIpReputationList", 1),
        // Blocca gli attacchi più comuni (OWASP Top 10)
        managedRuleGroup("AWSManagedRulesCommonRuleSet", 2, [
          {
            name: "SizeRestrictions_BODY",
            actionToUse: { count: {} },
          },
        ]),
        //Blocca pattern di vulnerabilità specifiche già note
        managedRuleGroup("AWSManagedRulesKnownBadInputsRuleSet", 3),
      ],
    });

    this.webAclArn = webAcl.attrArn;
  }
}
