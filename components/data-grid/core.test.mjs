import {
  readGridParams,
  writeGridParams,
  applyChange,
  clearNamespace,
  param,
} from "./core/url-state.mjs";
import { encodeFilter, decodeFilter } from "./core/filter-model.mjs";
import { DEFAULT_QUERY } from "./core/query.mjs";

let pass = 0,
  fail = 0;
const ok = (n, c, d = "") =>
  c ? (pass++, console.log("  ok   " + n)) : (fail++, console.log("  FAIL " + n + " " + d));

console.log("\nparam naming");
ok("prefix + underscore + suffix", param("ten", "page") === "ten_page", param("ten", "page"));

console.log("\nomit defaults");
const fresh = writeGridParams("ten", DEFAULT_QUERY).toString();
ok("a default query writes NOTHING", fresh === "", `got "${fresh}"`);
const p2 = writeGridParams("ten", { ...DEFAULT_QUERY, page: 3, q: "acme" }).toString();
ok("only non-defaults appear", p2 === "ten_q=acme&ten_page=3", p2);

console.log("\nunrelated params survive");
const base = new URLSearchParams("utm=x&other_page=9");
const merged = writeGridParams("ten", { ...DEFAULT_QUERY, page: 2 }, base);
ok("other grid untouched", merged.get("other_page") === "9");
ok("campaign tag untouched", merged.get("utm") === "x");

console.log("\nround trip");
const filter = {
  conjunction: "and",
  conditions: [{ field: "status", operator: "in", values: ["active", "Zürich 日本"] }],
};
const q = {
  ...DEFAULT_QUERY,
  q: "acme",
  page: 4,
  pageSize: 100,
  sort: [{ field: "name", direction: "desc" }],
  filter,
  display: "cards",
};
const written = writeGridParams("ten", q);
const { query: back } = readGridParams("ten", written, {
  sortableFields: new Set(["name"]),
  filterFields: new Map([["status", "enum"]]),
});
ok("search survives", back.q === "acme");
ok("page survives", back.page === 4);
ok("pageSize survives", back.pageSize === 100);
ok("sort survives", back.sort[0].field === "name" && back.sort[0].direction === "desc");
ok("display survives", back.display === "cards");
ok(
  "non-ASCII filter value survives",
  back.filter.conditions[0].values[1] === "Zürich 日本",
  JSON.stringify(back.filter),
);

console.log("\nuntrusted input degrades, never throws");
const bad = new URLSearchParams(
  "ten_page=-5&ten_size=99999&ten_sort=evil:asc&ten_fx=notbase64&ten_seg=ghost&ten_view=hologram",
);
const { query: safe, droppedFilterFields } = readGridParams("ten", bad, {
  sortableFields: new Set(["name"]),
  segmentIds: ["active"],
});
ok("negative page clamps to 1", safe.page === 1, String(safe.page));
ok("absurd page size falls back", safe.pageSize === 25, String(safe.pageSize));
ok("unknown sort field dropped", safe.sort.length === 0, JSON.stringify(safe.sort));
ok("garbage filter ignored", safe.filter.conditions.length === 0);
ok("undeclared segment dropped", safe.segment === undefined, String(safe.segment));
ok("unknown display falls back", safe.display === "table", safe.display);

console.log("\ndropped fields are REPORTED, not silent");
const enc = encodeFilter({
  conjunction: "and",
  conditions: [{ field: "retired", operator: "in", values: ["x"] }],
});
const { dropped } = decodeFilter(enc, new Map([["status", "enum"]]));
ok("renamed field is reported", dropped.includes("retired"), JSON.stringify(dropped));

console.log("\nreset rules");
ok("search resets page", applyChange({ ...DEFAULT_QUERY, page: 7 }, "search").query.page === 1);
ok("sort resets page", applyChange({ ...DEFAULT_QUERY, page: 7 }, "sort").query.page === 1);
ok(
  "paging does NOT reset page",
  applyChange({ ...DEFAULT_QUERY, page: 7 }, "page").query.page === 7,
);
ok("search replaces history", applyChange(DEFAULT_QUERY, "search").history === "replace");
ok("paging pushes history", applyChange(DEFAULT_QUERY, "page").history === "push");
ok(
  "filter drops all-matching selection",
  applyChange(DEFAULT_QUERY, "filter").dropSelection === true,
);
ok("sorting keeps selection", applyChange(DEFAULT_QUERY, "sort").dropSelection === false);

console.log("\nreset clears only this namespace");
const two = clearNamespace("ten", new URLSearchParams("ten_q=a&ten_page=2&pol_q=b&utm=z"));
ok("own params cleared", !two.get("ten_q") && !two.get("ten_page"));
ok("other grid preserved", two.get("pol_q") === "b");
ok("unrelated preserved", two.get("utm") === "z");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
