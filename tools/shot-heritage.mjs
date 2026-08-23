import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 620, height: 400 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:4399/tools/heritage.html", { waitUntil: "load" });
await p.waitForTimeout(600);
await p.locator(".win").screenshot({ path: "docs/public/screenshots/heritage-vb-colourway.png" });
await b.close();
console.log("heritage-vb-colourway.png");
