import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import type { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  AllowedMethods,
  type BehaviorOptions,
  CachePolicy,
  Distribution,
  OriginProtocolPolicy,
  OriginRequestPolicy,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { LoadBalancerV2Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { AttributeType, Billing, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import {
  GatewayVpcEndpointAwsService,
  IpAddresses,
  Peer,
  Port,
  PrefixList,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
  AppProtocol,
  Cluster,
  ContainerImage,
  CpuArchitecture,
  FargateService,
  FargateTaskDefinition,
  LinuxParameters,
  LogDrivers,
  OperatingSystemFamily,
  Secret,
} from "aws-cdk-lib/aws-ecs";
import { CfnServerlessCache } from "aws-cdk-lib/aws-elasticache";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

interface ArrosticiniAppStackProps extends StackProps {
  projectId: string;
  webTagVer: string;
  apiTagVer: string;
  domainName: string;
  certificate: ICertificate;
  webAclArn: string;
}

export class ArrosticiniAppStack extends Stack {
  constructor(scope: Construct, id: string, props: ArrosticiniAppStackProps) {
    super(scope, id, props);

    const { projectId, env, apiTagVer, webTagVer, domainName, certificate, webAclArn } = props;
    if (!env) throw new Error("No enviroment settings found!");

    const vpc = new Vpc(this, "Vpc", {
      vpcName: `${projectId}-vpc`,
      ipAddresses: IpAddresses.cidr("10.10.0.0/16"),
      maxAzs: 2,
      natGateways: 2,
      subnetConfiguration: [
        { name: "Public", subnetType: SubnetType.PUBLIC, cidrMask: 20 },
        { name: "Private", subnetType: SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 20 },
        { name: "Isolated", subnetType: SubnetType.PRIVATE_ISOLATED, cidrMask: 20 },
      ],
      gatewayEndpoints: {
        S3: { service: GatewayVpcEndpointAwsService.S3 },
        DynamoDb: { service: GatewayVpcEndpointAwsService.DYNAMODB },
      },
    });

    const productsTable = new TableV2(this, "ProductsTable", {
      partitionKey: { name: "slug", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billing: Billing.onDemand(),
      globalSecondaryIndexes: [
        {
          indexName: "byStatus",
          partitionKey: { name: "status", type: AttributeType.STRING },
          sortKey: { name: "slug", type: AttributeType.STRING },
        },
        {
          indexName: "bySlug",
          partitionKey: { name: "kind", type: AttributeType.STRING },
          sortKey: { name: "slug", type: AttributeType.STRING },
        },
      ],
    });

    new CfnOutput(this, "ProductsTableName", {
      value: productsTable.tableName,
    });

    const usersTable = new TableV2(this, "UsersTable", {
      partitionKey: { name: "userId", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billing: Billing.onDemand(),
      globalSecondaryIndexes: [
        {
          indexName: "byStatus",
          partitionKey: { name: "status", type: AttributeType.STRING },
          sortKey: { name: "createdAt", type: AttributeType.STRING },
        },
        {
          indexName: "byCreatedAt",
          partitionKey: { name: "kind", type: AttributeType.STRING },
          sortKey: { name: "createdAt", type: AttributeType.STRING },
        },
      ],
    });

    new CfnOutput(this, "UsersTableName", {
      value: usersTable.tableName,
    });

    const userEmailsTable = new TableV2(this, "UserEmailsTable", {
      partitionKey: { name: "email", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billing: Billing.onDemand(),
    });

    new CfnOutput(this, "UserEmailsTableName", {
      value: userEmailsTable.tableName,
    });

    const ordersTable = new TableV2(this, "OrdersTable", {
      partitionKey: { name: "orderId", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billing: Billing.onDemand(),
      globalSecondaryIndexes: [
        {
          indexName: "byUser",
          partitionKey: { name: "userId", type: AttributeType.STRING },
          sortKey: { name: "createdAt", type: AttributeType.STRING },
        },
        {
          indexName: "byStatus",
          partitionKey: { name: "status", type: AttributeType.STRING },
          sortKey: { name: "createdAt", type: AttributeType.STRING },
        },
        {
          indexName: "byCreatedAt",
          partitionKey: { name: "kind", type: AttributeType.STRING },
          sortKey: { name: "createdAt", type: AttributeType.STRING },
        },
      ],
    });

    new CfnOutput(this, "OrdersTableName", {
      value: ordersTable.tableName,
    });

    const paymentsTable = new TableV2(this, "PaymentsTable", {
      partitionKey: { name: "orderId", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billing: Billing.onDemand(),
    });

    new CfnOutput(this, "PaymentsTableName", {
      value: paymentsTable.tableName,
    });

    const paymentCustomersTable = new TableV2(this, "PaymentCustomersTable", {
      partitionKey: { name: "userId", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billing: Billing.onDemand(),
    });

    new CfnOutput(this, "PaymentCustomersTableName", {
      value: paymentCustomersTable.tableName,
    });

    const stripeEventsTable = new TableV2(this, "StripeEventsTable", {
      partitionKey: { name: "eventId", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billing: Billing.onDemand(),
      timeToLiveAttribute: "ttl",
    });

    new CfnOutput(this, "StripeEventsTableName", {
      value: stripeEventsTable.tableName,
    });

    const mediaBucket = new Bucket(this, "MediaBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    new CfnOutput(this, "MediaBucketName", {
      value: mediaBucket.bucketName,
    });

    const valkeySecurityGroup = new SecurityGroup(this, "ValkeySecurityGroup", {
      vpc,
      description: "Valkey",
      allowAllOutbound: false,
    });

    const valkey = new CfnServerlessCache(this, "Valkey", {
      serverlessCacheName: `${projectId}-cache`,
      engine: "valkey",
      majorEngineVersion: "9",
      subnetIds: vpc.isolatedSubnets.map((subnet) => subnet.subnetId),
      securityGroupIds: [valkeySecurityGroup.securityGroupId],
    });

    const cluster = new Cluster(this, "Cluster", {
      vpc,
      clusterName: `${projectId}-cluster`,
      defaultCloudMapNamespace: { name: projectId, useForServiceConnect: true },
    });

    const valkeyUrl = `rediss://${valkey.attrEndpointAddress}:${valkey.attrEndpointPort}`;

    const apiTaskDefinition = new FargateTaskDefinition(this, "ApiTaskDefinition", {
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        operatingSystemFamily: OperatingSystemFamily.LINUX,
        cpuArchitecture: CpuArchitecture.X86_64,
      },
    });

    apiTaskDefinition.addContainer("api", {
      image: ContainerImage.fromEcrRepository(
        Repository.fromRepositoryName(this, "ApiRepository", `${projectId}/api`),
        apiTagVer,
      ),
      portMappings: [{ name: "api", containerPort: 4000, appProtocol: AppProtocol.http }],
      linuxParameters: new LinuxParameters(this, "ApiLinuxParameters", {
        initProcessEnabled: true,
      }),
      logging: LogDrivers.awsLogs({
        streamPrefix: "api",
        logGroup: new LogGroup(this, "ApiLogGroup", {
          retention: RetentionDays.ONE_WEEK,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
      }),
      healthCheck: {
        command: ["CMD-SHELL", "wget -q -O /dev/null http://localhost:4000/healthz || exit 1"],
      },
      environment: {
        AWS_REGION: this.region,
        VALKEY_URL: valkeyUrl,
        MEDIA_BUCKET: mediaBucket.bucketName,
        PRODUCTS_TABLE: productsTable.tableName,
        USERS_TABLE: usersTable.tableName,
        USER_EMAILS_TABLE: userEmailsTable.tableName,
        ORDERS_TABLE: ordersTable.tableName,
        PAYMENTS_TABLE: paymentsTable.tableName,
        PAYMENT_CUSTOMERS_TABLE: paymentCustomersTable.tableName,
        STRIPE_EVENTS_TABLE: stripeEventsTable.tableName,
      },
      secrets: {
        STRIPE_SECRET_KEY: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(this, "StripeSecretKey", {
            parameterName: `/${projectId}/stripe-secret-key`,
          }),
        ),
        STRIPE_WEBHOOK_SECRET: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(this, "StripeWebhookSecret", {
            parameterName: `/${projectId}/stripe-webhook-secret`,
          }),
        ),
      },
    });

    const tables: TableV2[] = [
      productsTable,
      usersTable,
      userEmailsTable,
      ordersTable,
      paymentsTable,
      paymentCustomersTable,
      stripeEventsTable,
    ];

    tables.forEach((table) => {
      table.grantReadWriteData(apiTaskDefinition.taskRole);
    });
    mediaBucket.grantReadWrite(apiTaskDefinition.taskRole);

    const apiSecurityGroup = new SecurityGroup(this, "ApiSecurityGroup", {
      vpc,
      description: "api",
    });

    valkeySecurityGroup.addIngressRule(apiSecurityGroup, Port.tcp(6379));

    const apiService = new FargateService(this, "ApiService", {
      cluster,
      serviceName: "api",
      taskDefinition: apiTaskDefinition,
      desiredCount: 2,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [apiSecurityGroup],
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
      enableExecuteCommand: true,
      serviceConnectConfiguration: {
        services: [
          {
            portMappingName: "api",
            dnsName: "api",
            port: 4000,
          },
        ],
      },
    });

    const loadBalancer = new ApplicationLoadBalancer(this, "LoadBalancer", {
      vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });

    const listener = loadBalancer.addListener("Http", { port: 80, open: false });

    loadBalancer.connections.allowFrom(
      Peer.prefixList(
        PrefixList.fromLookup(this, "CloudFrontOriginFacing", {
          prefixListName: "com.amazonaws.global.cloudfront.origin-facing",
        }).prefixListId,
      ),
      Port.tcp(80),
    );

    const webTaskDefinition = new FargateTaskDefinition(this, "WebTaskDefinition", {
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        operatingSystemFamily: OperatingSystemFamily.LINUX,
        cpuArchitecture: CpuArchitecture.X86_64,
      },
    });

    webTaskDefinition.addContainer("web", {
      image: ContainerImage.fromEcrRepository(
        Repository.fromRepositoryName(this, "WebRepository", `${projectId}/web`),
        webTagVer,
      ),
      portMappings: [{ name: "web", containerPort: 3100, appProtocol: AppProtocol.http }],
      linuxParameters: new LinuxParameters(this, "WebLinuxParameters", {
        initProcessEnabled: true,
      }),
      logging: LogDrivers.awsLogs({
        streamPrefix: "web",
        logGroup: new LogGroup(this, "WebLogGroup", {
          retention: RetentionDays.ONE_WEEK,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
      }),
      environment: {
        VALKEY_URL: valkeyUrl,
        API_URL: "http://api:4000",
        PUBLIC_ORIGIN: `https://${domainName}`,
      },
      secrets: {
        SESSION_SECRET: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(this, "SessionSecret", {
            parameterName: `/${projectId}/session-secret`,
          }),
        ),
      },
    });

    const webSecurityGroup = new SecurityGroup(this, "WebSecurityGroup", {
      vpc,
    });
    valkeySecurityGroup.addIngressRule(webSecurityGroup, Port.tcp(6379));
    apiSecurityGroup.addIngressRule(webSecurityGroup, Port.tcp(4000));

    const webService = new FargateService(this, "WebService", {
      cluster,
      serviceName: "web",
      taskDefinition: webTaskDefinition,
      desiredCount: 2,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [webSecurityGroup],
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
      enableExecuteCommand: true,
      serviceConnectConfiguration: {},
    });

    webService.node.addDependency(apiService);

    listener.addTargets("Web", {
      port: 3100,
      protocol: ApplicationProtocol.HTTP,
      targets: [webService],
      healthCheck: {
        path: "/healthz",
        interval: Duration.seconds(5),
        timeout: Duration.seconds(4),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
      },
      deregistrationDelay: Duration.seconds(15),
    });

    const loadBalancerOrigin = new LoadBalancerV2Origin(loadBalancer, {
      protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
    });

    const cachedBehaviour: BehaviorOptions = {
      origin: loadBalancerOrigin,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
    };

    const distribution = new Distribution(this, "Distribution", {
      domainNames: [domainName],
      certificate,
      webAclId: webAclArn,
      defaultBehavior: {
        origin: loadBalancerOrigin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachePolicy: CachePolicy.CACHING_DISABLED,
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
      },
      additionalBehaviors: {
        "/assets/*": cachedBehaviour,
        "/images/*": cachedBehaviour,
      },
    });

    new CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
    });
  }
}
