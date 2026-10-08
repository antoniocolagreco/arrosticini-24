import { mkdir, writeFile } from "node:fs/promises";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { stringify } from "yaml";
import { contract } from "../src/index.js";

const generator = new OpenAPIGenerator({ schemaConverters: [new ZodToJsonSchemaConverter()] });
const outputDir = new URL("../openapi/", import.meta.url);

await mkdir(outputDir, { recursive: true });

for (const [context, router] of Object.entries(contract)) {
  const spec = await generator.generate(router, {
    info: { title: `Arrosticini 24ore ${context} API`, version: "1.0.0" },
  });
  await writeFile(new URL(`${context}.yaml`, outputDir), stringify(spec));
}
