import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filename);
    else if (/\.tsx?$/.test(filename) && !/\.test\.tsx?$/.test(filename)) files.push(filename);
  }
}
walk(sourceRoot);
const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options;
const resolutionCache = ts.createModuleResolutionCache(root, (filename) => filename, options);
const relative = (filename) => path.relative(root, filename).replaceAll("\\", "/");
const errors = [];
const graph = new Map();
for (const filename of files) {
  const file = ts.createSourceFile(filename, fs.readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true);
  const edges = [];
  function inspect(node) {
    const declaration = ts.isImportDeclaration(node) || ts.isExportDeclaration(node);
    const specifier = declaration ? node.moduleSpecifier : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword ? node.arguments[0] : undefined;
    if (specifier && ts.isStringLiteral(specifier)) {
      const target = ts.resolveModuleName(specifier.text, filename, options, ts.sys, resolutionCache).resolvedModule?.resolvedFileName;
      if (target && path.resolve(target).startsWith(sourceRoot + path.sep)) {
        const from = relative(filename), to = relative(path.resolve(target));
        const domain = from.startsWith("src/modules/");
        const ui = /^src\/shared\/(ui|components|providers)\//.test(to) || to.startsWith("src/shared/forms/modern");
        if ((domain && (to.startsWith("src/panels/") || to.startsWith("src/data/mock/") || ui)) ||
            (from.startsWith("src/data/contracts/") && (to.startsWith("src/panels/") || to.startsWith("src/data/mock/") || ui)) ||
            (from.startsWith("src/shared/") && to.startsWith("src/panels/")) ||
            (domain && !from.includes("/application/") && /^(react|react-dom|next)(\/|$)/.test(specifier.text))) errors.push(from + " -> " + to);
        const clause = node.importClause;
        const bindings = clause?.namedBindings;
        const onlyTypes = node.isTypeOnly || clause?.isTypeOnly || (bindings && ts.isNamedImports(bindings) && !clause.name && bindings.elements.every((item) => item.isTypeOnly));
        if (declaration && !onlyTypes) edges.push(path.resolve(target));
      } else if (domainImport(filename) && /^(react|react-dom|next)(\/|$)/.test(specifier.text)) errors.push(relative(filename) + " -> " + specifier.text);
    }
    ts.forEachChild(node, inspect);
  }
  inspect(file);
  graph.set(filename, edges);
}
function domainImport(filename) { const name = relative(filename); return name.startsWith("src/modules/") || name.startsWith("src/data/contracts/"); }
const visited = new Set(), active = new Set();
function visit(filename, trail) {
  if (active.has(filename)) { errors.push("Runtime import cycle: " + [...trail, filename].map(relative).join(" -> ")); return; }
  if (visited.has(filename)) return;
  visited.add(filename); active.add(filename);
  for (const next of graph.get(filename) ?? []) visit(next, [...trail, filename]);
  active.delete(filename);
}
for (const filename of files) visit(filename, []);
if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
else console.log("Architecture boundaries and static runtime import cycles passed (" + files.length + " files).");
