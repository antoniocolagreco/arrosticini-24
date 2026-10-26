import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const REGION = "eu-south-1";
const PROJECT_ID = "arrosticini";
const DOMAIN_NAME = "arrosticini.colagreco.dev";

interface CloudflareResponse<T> {
  success: boolean;
  errors: { code: number; message: string }[];
  result: T;
}

interface DnsRecord {
  id: string;
  content: string;
}

const ssm = new SSMClient({ region: REGION });
const cloudFormation = new CloudFormationClient({ region: REGION });

async function parameter(name: string) {
  const { Parameter } = await ssm.send(
    new GetParameterCommand({ Name: `/${PROJECT_ID}/${name}`, WithDecryption: true }),
  );
  if (!Parameter?.Value) throw new Error(`Parameter /${PROJECT_ID}/${name} not found!`);
  return Parameter.Value;
}

const { Stacks } = await cloudFormation.send(
  new DescribeStacksCommand({ StackName: `${PROJECT_ID}-app` }),
);
const target = Stacks?.[0]?.Outputs?.find(
  (output) => output.OutputKey === "DistributionDomainName",
)?.OutputValue;
if (!target) throw new Error("DistributionDomainName output not found!");

const zoneId = await parameter("cloudflare-zone-id");
const token = await parameter("cloudflare-api-token");

async function cloudflare<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const body = (await response.json()) as CloudflareResponse<T>;
  if (!response.ok || !body.success) {
    throw new Error(`Cloudflare ${init.method ?? "GET"} ${path}: ${JSON.stringify(body.errors)}`);
  }
  return body.result;
}

const record = { type: "CNAME", name: DOMAIN_NAME, content: target, proxied: false, ttl: 1 };
const [existing] = await cloudflare<DnsRecord[]>(`/dns_records?type=CNAME&name=${DOMAIN_NAME}`);

if (existing === undefined) {
  await cloudflare("/dns_records", { method: "POST", body: JSON.stringify(record) });
  console.log(`${DOMAIN_NAME} created, pointing to ${target}`);
} else if (existing.content === target) {
  console.log(`${DOMAIN_NAME} already points to ${target}`);
} else {
  await cloudflare(`/dns_records/${existing.id}`, { method: "PUT", body: JSON.stringify(record) });
  console.log(`${DOMAIN_NAME} updated from ${existing.content} to ${target}`);
}
