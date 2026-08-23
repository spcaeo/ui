/**
 * Discover components. One folder under components/ with a component.json is a
 * component; the tools iterate whatever is there, so adding the next one needs
 * no change to any script.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const COMPONENTS_DIR = join(ROOT, "components");

export function allComponents() {
  if (!existsSync(COMPONENTS_DIR)) return [];
  return readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(COMPONENTS_DIR, d.name, "component.json")))
    .map((d) => {
      const dir = join(COMPONENTS_DIR, d.name);
      return { dir, ...JSON.parse(readFileSync(join(dir, "component.json"), "utf8")) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Components named on the command line, or all of them. Lets you work on one
 * component without paying for every other component's browser tests.
 */
export function selected(argv = process.argv.slice(2)) {
  const names = argv.filter((a) => !a.startsWith("-"));
  const all = allComponents();
  if (!names.length) return all;
  const picked = all.filter((c) => names.includes(c.name));
  const missing = names.filter((n) => !all.some((c) => c.name === n));
  if (missing.length) {
    console.error(`Unknown component(s): ${missing.join(", ")}`);
    console.error(`Known: ${all.map((c) => c.name).join(", ") || "(none)"}`);
    process.exit(1);
  }
  return picked;
}
