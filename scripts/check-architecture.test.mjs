import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const checker = fileURLToPath(new URL("./check-architecture.mjs", import.meta.url));
function check(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "afhomes-boundaries-"));
  try {
    fs.writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { moduleResolution: "bundler", module: "esnext", paths: { "@/*": ["./src/*"] } } }));
    for (const [name, content] of Object.entries(files)) {
      const target = path.join(root, "src", name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
    }
    const result = spawnSync(process.execPath, [checker, root], { encoding: "utf8" });
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("afhomes-boundaries-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("rejects aliased domain adapter imports and relative re-exports", () => {
  const result = check({ "modules/example/rules.ts": 'import { value } from "@/data/mock/example"; export { value };', "data/mock/example.ts": "export const value = 1;", "shared/example.ts": 'export { value } from "../panels/example";', "panels/example.ts": "export const value = 1;" });
  assert.equal(result.status, 1);
  assert.match(result.output, /modules\/example\/rules.ts -> src\/data\/mock\/example.ts/);
  assert.match(result.output, /shared\/example.ts -> src\/panels\/example.ts/);
});

test("rejects runtime import cycles", () => {
  const result = check({ "modules/a.ts": 'export { b } from "./b"; export const a = 1;', "modules/b.ts": 'export { a } from "./a"; export const b = 2;' });
  assert.equal(result.status, 1);
  assert.match(result.output, /Runtime import cycle/);
});

test("allows type cycles and domain-owned pure helpers", () => {
  const result = check({ "modules/a.ts": 'import type { B } from "./b"; export type A = { b: B };', "modules/b.ts": 'import type { A } from "./a"; export type B = { a: A };', "shared/value.ts": "export const value = 1;" });
  assert.equal(result.status, 0, result.output);
});

test("rejects framework dependencies in repository contracts", () => {
  const result = check({ "data/contracts/example.ts": 'import type { ReactNode } from "react"; export type Value = ReactNode;' });
  assert.equal(result.status, 1);
  assert.match(result.output, /data\/contracts\/example.ts -> react/);
});
