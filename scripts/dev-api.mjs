// Runs `next` (dev by default) in api mode with the local emulator settings from scripts/api-local.env.
// Node's --env-file flag cannot be used because Next re-launches itself and rejects it.
// Usage: npm run dev:api [-- --port 3100]      or: node scripts/dev-api.mjs build | start --port 3100
// Next allows only one `next dev` per project folder, so stop other dev servers first.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const settings = parseEnv(readFileSync(new URL("./api-local.env", import.meta.url), "utf8"));
const next = new URL("../node_modules/next/dist/bin/next", import.meta.url);
const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith("-") ? args.shift() : "dev";
const child = spawn(process.execPath, [next.pathname.replace(/^\/([A-Za-z]:)/, "$1"), command, ...args], {
  stdio: "inherit",
  env: { ...process.env, ...settings },
});
child.on("exit", (code) => process.exit(code ?? 0));
