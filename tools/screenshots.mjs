#!/usr/bin/env node
/**
 * Capture each component's screenshots into docs/public/screenshots/<component>/.
 *
 *   npm run screenshots                 every component
 *   npm run screenshots folder-tabs     just one
 *
 * Shots are declared in each component.json, so adding one is a data change
 * rather than a code change. Pages are served over http rather than opened from
 * file:// because some demo pages import real ES modules, which file:// refuses
 * on CORS grounds.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { chromium } from "playwright";
import { ROOT, selected } from "./lib/components.mjs";

const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = createServer(async (req, res) => {
  try {
    const rel = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const file = join(ROOT, rel);
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});
await new Promise((r) => server.listen(0, r));
const origin = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
let count = 0;

for (const component of selected()) {
  const outDir = join(ROOT, "docs/public/screenshots", component.screenshotDir ?? component.name);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  console.log(
    `\n${component.name} -> docs/public/screenshots/${component.screenshotDir ?? component.name}/`,
  );

  for (const shot of component.shots ?? []) {
    for (const theme of shot.themes ?? [null]) {
      const page = await browser.newPage({
        viewport: shot.viewport ?? { width: 980, height: 900 },
        deviceScaleFactor: 2,
      });
      const rel = join("components", component.name, shot.page).split("\\").join("/");
      await page.goto(`${origin}/${rel}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(400);

      if (theme) {
        await page.evaluate((m) => {
          const el = document.documentElement;
          el.classList.remove("dark", "light");
          el.classList.add(m);
        }, theme);
        await page.waitForTimeout(250);
      }
      if (shot.filter) {
        await page.evaluate((f) => (document.documentElement.style.filter = f), shot.filter);
        await page.waitForTimeout(200);
      }

      const name = shot.name.replace("{theme}", theme ?? "");
      const path = join(outDir, `${name}.png`);
      if (shot.fullPage) {
        await page.screenshot({ path, fullPage: true });
      } else if (shot.clipHeight) {
        // A tight crop: the element, capped in height, so a hero image shows the
        // rail and the top of the panel rather than the whole component.
        const box = await page.locator(shot.selector).first().boundingBox();
        await page.screenshot({
          path,
          clip: {
            x: box.x - 8,
            y: box.y - 8,
            width: box.width + 16,
            height: Math.min(box.height + 16, shot.clipHeight),
          },
        });
      } else {
        await page.locator(shot.selector).first().screenshot({ path });
      }

      console.log(`   ${name}.png`);
      count++;
      await page.close();
    }
  }
}

await browser.close();
server.close();
console.log(`\n${count} screenshots written\n`);
