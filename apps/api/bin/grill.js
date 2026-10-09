import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { seconds: { type: "string", default: "60" } } });
const seconds = Number(values.seconds);

if (!Number.isFinite(seconds) || seconds <= 0) {
  console.error("Usage: node bin/grill.js --seconds <positive number>");
  process.exit(1);
}

console.log(`Grilling one CPU core for ${seconds} s`);
const end = Date.now() + seconds * 1000;
let spins = 0;
while (Date.now() < end) {
  spins += 1;
}
console.log(`Done after ${spins} spins`);
