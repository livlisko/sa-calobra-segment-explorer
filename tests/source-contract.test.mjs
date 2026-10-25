import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the explorer remains a standalone product without relief-map coupling", () => {
  const sourceFiles = ["src/App.jsx", "src/styles.css", "index.html"];
  const source = sourceFiles.map((file) => fs.readFileSync(path.join(ROOT, file), "utf8")).join("\n");
  assert(!/relief atlas|relief map|map-app|sa-calobra-camp-2026/i.test(source));
  assert.match(source, /Sa Calobra Segment Explorer/);
});

test("the accepted concept and design contract are preserved with the project", () => {
  assert(fs.existsSync(path.join(ROOT, "design", "concept-segment-desktop.png")));
  const design = fs.readFileSync(path.join(ROOT, "DESIGN.md"), "utf8");
  assert.match(design, /one selected camp-posted segment at a time/i);
  assert.match(design, /PDF Camp results, Strava Following, and within-rider FIT comparisons are never/i);
});
