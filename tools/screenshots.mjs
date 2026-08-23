import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs/public/screenshots");
const url = "file://" + join(root, "demo.html");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 980, height: 900 },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => document.fonts?.ready);
await page.waitForTimeout(400);

const setTheme = async (mode) => {
  await page.evaluate((m) => {
    const el = document.documentElement;
    el.classList.remove("dark", "light");
    el.classList.add(m);
  }, mode);
  await page.waitForTimeout(250);
};

const sections = await page.$$("section");
const shot = async (target, name, opts = {}) => {
  await target.screenshot({ path: join(out, name + ".png"), ...opts });
  console.log("  ", name + ".png");
};

for (const mode of ["light", "dark"]) {
  await setTheme(mode);
  console.log(mode + ":");
  await page.screenshot({ path: join(out, `demo-${mode}.png`), fullPage: true });
  console.log("   demo-" + mode + ".png");
  await shot(sections[0], `tabs-${mode}`);
  await shot(sections[1], `nested-${mode}`);
  await shot(sections[2], `overflow-${mode}`);
  await shot(sections[3], `flush-${mode}`);
}

// The greyscale proof: shape and shared fill still carry the state with every
// hue removed. This is the claim the whole design rests on, so show it.
await setTheme("light");
await page.evaluate(() => (document.documentElement.style.filter = "grayscale(1)"));
await page.waitForTimeout(200);
await shot(sections[0], "greyscale-proof");

// A tight hero crop of just the rail + top of the panel.
await page.evaluate(() => (document.documentElement.style.filter = ""));
await page.waitForTimeout(150);
const host = await page.$("section:nth-of-type(1) [data-folder-tabs]");
const box = await host.boundingBox();
await page.screenshot({
  path: join(out, "hero.png"),
  clip: {
    x: box.x - 8,
    y: box.y - 8,
    width: box.width + 16,
    height: Math.min(box.height + 16, 150),
  },
});
console.log("   hero.png");

await browser.close();
