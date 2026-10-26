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

const action = process.argv[2];
if (action !== "update" && action !== "delete") throw new Error("Usage: dns.ts update|delete");

const ssm = new SSMClient({ region: REGION });
const cloudFormation = new CloudFormationClient({ region: REGION });

async function parameter(name: string) {
  const { Parameter } = await ssm.send(
    new GetParameterCommand({ Name: `/${PROJECT_ID}/${name}`, WithDecryption: true }),
  );
  if (!Parameter?.Value) throw new Error(`Parameter /${PROJECT_ID}/${name} not found!`);
  return Parameter.Value;
}

async function distributionDomainName() {
  try {
    const { Stacks } = await cloudFormation.send(
      new DescribeStacksCommand({ StackName: `${PROJECT_ID}-app` }),
    );
    return Stacks?.[0]?.Outputs?.find((output) => output.OutputKey === "DistributionDomainName")
      ?.OutputValue;
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not exist")) return undefined;
    throw error;
  }
}

const target = await distributionDomainName();
if (action === "update" && !target) throw new Error("DistributionDomainName output not found!");
if (action === "delete" && target) {
  throw new Error(`${PROJECT_ID}-app still serves ${target}, ${DOMAIN_NAME} not deleted!`);
}

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

const [existing] = await cloudflare<DnsRecord[]>(`/dns_records?type=CNAME&name=${DOMAIN_NAME}`);

if (action === "delete") {
  if (existing === undefined) {
    console.log(`${DOMAIN_NAME} does not exist`);
  } else {
    await cloudflare(`/dns_records/${existing.id}`, { method: "DELETE" });
    console.log(`${DOMAIN_NAME} deleted, it pointed to ${existing.content}`);
  }
} else {
  const record = { type: "CNAME", name: DOMAIN_NAME, content: target, proxied: false, ttl: 1 };
  if (existing === undefined) {
    await cloudflare("/dns_records", { method: "POST", body: JSON.stringify(record) });
    console.log(`${DOMAIN_NAME} created, pointing to ${target}`);
  } else if (existing.content === target) {
    console.log(`${DOMAIN_NAME} already points to ${target}`);
  } else {
    await cloudflare(`/dns_records/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify(record),
    });
    console.log(`${DOMAIN_NAME} updated from ${existing.content} to ${target}`);
  }
}
