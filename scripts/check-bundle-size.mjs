#!/usr/bin/env node
/**
 * Enforces gzipped JavaScript budgets on the production build in dist/.
 *
 *   - INITIAL: JS the browser fetches on first load (entry script plus
 *     modulepreloads listed in dist/index.html). Guards the critical path,
 *     e.g. against an eager import pulling in the Stellar SDK.
 *   - CHUNK:   any single JS chunk.
 *   - TOTAL:   all JS chunks combined.
 *
 * It also fails on circular static imports between chunks: a cycle such as
 * vendor <-> react-vendor evaluates one chunk before its dependency is
 * initialised and white-screens the app at runtime while tests stay green.
 *
 * Usage: node scripts/check-bundle-size.mjs   (after `npm run build`)
 */
import { readFileSync, readdirSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const KB = 1024;
const BUDGETS = {
  initial: 250 * KB,
  chunk: 800 * KB,
  total: 1024 * KB,
};

const DIST = "dist";
const ASSETS = join(DIST, "assets");

if (!existsSync(ASSETS)) {
  console.error(`::error::${ASSETS} not found — run \`npm run build\` first.`);
  process.exit(1);
}

const gz = (file) => gzipSync(readFileSync(file)).length;
const fmt = (bytes) => `${(bytes / KB).toFixed(2)} KB`;

const chunks = readdirSync(ASSETS)
  .filter((f) => f.endsWith(".js"))
  .map((f) => ({ name: f, size: gz(join(ASSETS, f)) }))
  .sort((a, b) => b.size - a.size);

if (chunks.length === 0) {
  console.error(`::error::No JS files found in ${ASSETS}`);
  process.exit(1);
}

const html = readFileSync(join(DIST, "index.html"), "utf8");
const initialNames = new Set(
  [...html.matchAll(/(?:src|href)="\/assets\/([^"]+\.js)"/g)].map((m) => m[1]),
);

let failed = false;
const fail = (msg) => {
  console.error(`::error::${msg}`);
  failed = true;
};

console.log("Chunk (gzipped)");
for (const { name, size } of chunks) {
  const tag = initialNames.has(name) ? " [initial]" : "";
  console.log(`  ${fmt(size).padStart(11)}  ${name}${tag}`);
  if (size > BUDGETS.chunk) fail(`${name} is ${fmt(size)} gzipped (budget ${fmt(BUDGETS.chunk)})`);
}

const total = chunks.reduce((sum, c) => sum + c.size, 0);
const initial = chunks.filter((c) => initialNames.has(c.name)).reduce((sum, c) => sum + c.size, 0);

console.log(`\nInitial JS: ${fmt(initial)} / ${fmt(BUDGETS.initial)}`);
console.log(`Total JS:   ${fmt(total)} / ${fmt(BUDGETS.total)}`);

if (initial > BUDGETS.initial) fail(`Initial JS is ${fmt(initial)} gzipped (budget ${fmt(BUDGETS.initial)})`);
if (total > BUDGETS.total) fail(`Total JS is ${fmt(total)} gzipped (budget ${fmt(BUDGETS.total)})`);

// ── Circular chunk imports ────────────────────────────────────────────────
const staticImports = new Map(
  chunks.map(({ name }) => {
    const code = readFileSync(join(ASSETS, name), "utf8");
    // Static `import … from "./x.js"` / `import "./x.js"` only; dynamic
    // import() is lazy and cannot cause an initialisation-order crash.
    const deps = [...code.matchAll(/(?:^|[;}\s])import\s*(?:[\w$*{},\s]+from\s*)?["']\.\/([^"']+\.js)["']/g)].map((m) => m[1]);
    return [name, new Set(deps)];
  }),
);

function findCycle() {
  const state = new Map(); // name -> "visiting" | "done"
  const stack = [];
  const visit = (name) => {
    if (state.get(name) === "done") return null;
    if (state.get(name) === "visiting") return [...stack.slice(stack.indexOf(name)), name];
    state.set(name, "visiting");
    stack.push(name);
    for (const dep of staticImports.get(name) ?? []) {
      const cycle = visit(dep);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(name, "done");
    return null;
  };
  for (const name of staticImports.keys()) {
    const cycle = visit(name);
    if (cycle) return cycle;
  }
  return null;
}

const cycle = findCycle();
if (cycle) fail(`Circular import between chunks: ${cycle.join(" -> ")}`);
else console.log("No circular imports between chunks.");

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      "### Bundle size",
      "| Metric | Gzipped | Budget |",
      "| --- | --: | --: |",
      `| Initial JS | ${fmt(initial)} | ${fmt(BUDGETS.initial)} |`,
      `| Total JS | ${fmt(total)} | ${fmt(BUDGETS.total)} |`,
      `| Largest chunk | ${fmt(chunks[0].size)} | ${fmt(BUDGETS.chunk)} |`,
      "",
    ].join("\n"),
  );
}

if (failed) process.exit(1);
console.log("\nBundle size budgets passed.");
