#!/usr/bin/env node
/**
 * Behavioural test runner. Each component ships its own `test.mjs`; this opens
 * that component's demo in a real browser and hands it a page plus a `check`.
 *
 *   npm test                    every component
 *   npm test folder-tabs        just one
 *
 * These are deliberately behavioural rather than unit tests: every bug this
 * collection has actually shipped was an interaction bug — a panel that
 * vanished, a focus that went off-screen, a page that scrolled itself — and
 * none of them would have been caught by asserting on a function's return value.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { selected } from "./lib/components.mjs";

const components = selected();
let passed = 0;
const failures = [];

const browser = await chromium.launch();

for (const component of components) {
  const testFile = join(component.dir, "test.mjs");
  if (!existsSync(testFile)) {
    console.log(`\n${component.name}: no test.mjs, skipping`);
    continue;
  }

  console.log(`\n########## ${component.name} ##########`);
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const url = pathToFileURL(join(component.dir, component.demo)).href;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(300);

  const check = (name, ok, detail = "") => {
    if (ok) {
      passed++;
      console.log(`  ok   ${name}`);
    } else {
      failures.push(`${component.name}: ${name}${detail ? " — " + detail : ""}`);
      console.log(`  FAIL ${name} ${detail}`);
    }
  };

  const { default: run } = await import(pathToFileURL(testFile).href);
  try {
    await run({ page, check, component, url });
  } catch (error) {
    failures.push(`${component.name}: threw — ${error.message}`);
    console.log(`  FAIL threw — ${error.message}`);
  }
  await page.close();
}

await browser.close();

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error("\n" + failures.map((f) => "  - " + f).join("\n") + "\n");
  process.exit(1);
}
console.log("");
