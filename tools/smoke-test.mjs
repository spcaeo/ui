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
import { execFileSync } from "node:child_process";
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
  /*
    A component may also ship `core.test.mjs` for logic that needs no browser —
    URL parsing, validation, encoding. Running it here rather than in a separate
    script means `npm test` really is the whole suite, and a contract regression
    cannot hide behind a passing UI test.
  */
  const coreTest = join(component.dir, "core.test.mjs");
  if (existsSync(coreTest)) {
    console.log(`\n########## ${component.name} — core ##########`);
    try {
      const out = execFileSync(process.execPath, [coreTest], { encoding: "utf8" });
      const summary = out
        .trim()
        .split("\n")
        .filter((l) => /passed, .* failed/.test(l))
        .pop();
      const count = Number(summary?.match(/^(\d+) passed/)?.[1] ?? 0);
      passed += count;
      console.log(`  ${summary ?? "ran"}`);
    } catch (error) {
      failures.push(
        `${component.name} core: ${(error.stdout ?? error.message).toString().trim().split("\n").slice(-3).join(" ")}`,
      );
      console.log(`  FAIL core tests`);
    }
  }

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
