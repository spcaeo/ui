#!/usr/bin/env node
/**
 * Smoke tests, driven against demo.html in a real browser.
 *
 * These are deliberately behavioural rather than unit tests: every bug this
 * control has actually shipped was an interaction bug (a panel that vanished, a
 * focus that went off-screen, a keyboard trap), and none of them would have been
 * caught by asserting on a function's return value.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = "file://" + join(root, "demo.html");

let passed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? " — " + detail : ""}`);
    console.log(`  FAIL ${name} ${detail}`);
  }
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(300);

console.log("\nvisible panel is never lost");
{
  // The bug: only tab 0 had aria-controls, so selecting any other tab hid the
  // panel and left the rail floating above nothing.
  const strip = "#overflow-demo";
  for (const i of [3, 7, 10, 0]) {
    await page.locator(`${strip} .fldr-tab`).nth(i).click();
    await page.waitForTimeout(80);
    const visible = await page.locator(`${strip} .fldr-panel:not([hidden])`).count();
    check(`tab ${i} keeps exactly one panel visible`, visible === 1, `saw ${visible}`);
  }
}

console.log("\nARIA wiring");
{
  const bad = await page.evaluate(() => {
    const problems = [];
    for (const tab of document.querySelectorAll('[role="tab"]')) {
      if (!tab.id) problems.push("tab without id: " + tab.textContent.trim());
      const id = tab.getAttribute("aria-controls");
      if (!id) {
        problems.push("tab without aria-controls: " + tab.textContent.trim());
        continue;
      }
      const panel = document.getElementById(id);
      if (!panel) problems.push("aria-controls points nowhere: " + id);
      else if (panel.getAttribute("role") !== "tabpanel")
        problems.push("panel missing role=tabpanel: " + id);
      else if (panel.getAttribute("aria-labelledby") !== tab.id)
        problems.push("panel not labelled by its tab: " + id);
    }
    return problems;
  });
  check("every tab/panel pair is fully wired", bad.length === 0, bad.slice(0, 3).join("; "));

  const selected = await page.evaluate(() => {
    const out = [];
    for (const list of document.querySelectorAll('[role="tablist"]')) {
      const scroll = list.querySelector(".fldr-scroll");
      const tabs = [...scroll.querySelectorAll(':scope > [role="tab"]')];
      out.push(tabs.filter((t) => t.getAttribute("aria-selected") === "true").length);
    }
    return out;
  });
  check(
    "exactly one aria-selected per tablist",
    selected.every((n) => n === 1),
    JSON.stringify(selected),
  );

  const roving = await page.evaluate(() => {
    const out = [];
    for (const list of document.querySelectorAll('[role="tablist"]')) {
      const tabs = [...list.querySelectorAll('.fldr-scroll > [role="tab"]')];
      out.push(tabs.filter((t) => t.tabIndex === 0).length);
    }
    return out;
  });
  check(
    "roving tabindex: one stop per tablist",
    roving.every((n) => n === 1),
    JSON.stringify(roving),
  );
}

console.log("\nkeyboard");
{
  const first = page.locator("section").first().locator(".fldr-tab").first();
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(60);
  check(
    "ArrowRight selects the next tab",
    (await page.evaluate(() => document.activeElement.textContent.trim())) === "Dates",
  );

  // "Preview" is aria-disabled and must be stepped over, not landed on.
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(60);
  const afterSkip = await page.evaluate(() => document.activeElement.textContent.trim());
  check(
    "ArrowRight skips the disabled tab",
    afterSkip === "Jurisdiction",
    `landed on "${afterSkip}"`,
  );

  await page.keyboard.press("Home");
  await page.waitForTimeout(60);
  check(
    "Home goes to the first tab",
    (await page.evaluate(() => document.activeElement.textContent.trim())).startsWith("Rules"),
  );

  await page.keyboard.press("End");
  await page.waitForTimeout(60);
  check(
    "End goes to the last tab",
    (await page.evaluate(() => document.activeElement.textContent.trim())) === "Jurisdiction",
  );
}

console.log("\nfocus stays visible when the strip overflows");
{
  // The failure this guards: arrow-keying to a tab off the right edge moves
  // focus somewhere the user cannot see.
  const strip = page.locator("#overflow-demo .fldr-scroll");
  await page.locator("#overflow-demo .fldr-tab").first().focus();
  // Earlier steps clicked around, and Playwright scrolls elements into view to
  // click them. Reset first so this measures ONLY what the keyboard does.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(120);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(500); // the strip scrolls smoothly; let it settle
  const inView = await page.evaluate(() => {
    const el = document.activeElement;
    const s = el.closest(".fldr-scroll");
    return (
      el.offsetLeft >= s.scrollLeft - 1 &&
      el.offsetLeft + el.offsetWidth <= s.scrollLeft + s.clientWidth + 1
    );
  });
  check("the focused tab is inside the visible strip", inView);

  // And the page itself must not have been dragged around to achieve that.
  const scrollAfter = await page.evaluate(() => window.scrollY);
  check(
    "arrow-keying the strip did not scroll the document",
    scrollAfter === scrollBefore,
    `scrollY ${scrollBefore} -> ${scrollAfter}`,
  );
  // `behavior: instant` overrides the stylesheet's smooth scrolling, so the
  // next assertions do not race an animation.
  await strip.evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));
  await page.waitForTimeout(150);
}

console.log("\noverflow arrows");
{
  const arrows = page.locator("#overflow-demo .fldr-arrows");
  check(
    "arrows are shown when the strip overflows",
    (await arrows.getAttribute("data-overflowing")) === "true",
  );
  check(
    "left arrow starts disabled",
    await arrows.locator('.fldr-arrow[data-dir="-1"]').isDisabled(),
  );
  check(
    "right arrow starts enabled",
    !(await arrows.locator('.fldr-arrow[data-dir="1"]').isDisabled()),
  );

  const narrowArrows = page.locator("section").first().locator(".fldr-arrows");
  check(
    "arrows stay hidden when everything fits",
    (await narrowArrows.getAttribute("data-overflowing")) === "false",
  );
}

console.log("\nnesting");
{
  // A nested control must not steal its parent's tabs, or vice versa.
  const outer = await page.evaluate(() => {
    const host = document.querySelectorAll("[data-folder-tabs]")[1];
    // `:scope >` matters: without it this also matches the NESTED control's
    // tabs, which is the exact mistake the source code has to avoid too.
    return host.querySelectorAll(':scope > .fldr-rail > .fldr-scroll > [role="tab"]').length;
  });
  check("outer control owns only its own tabs", outer === 2, `saw ${outer}`);
  await page.locator(".fldr-nested .fldr-tab").nth(1).click();
  await page.waitForTimeout(80);
  check(
    "selecting a nested tab leaves the outer panel open",
    await page.locator("#b-p1").isVisible(),
  );
  check("the nested panel switched", await page.locator("#c-p2").isVisible());
}

await browser.close();

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error("\n" + failures.map((f) => "  - " + f).join("\n") + "\n");
  process.exit(1);
}
console.log("");
