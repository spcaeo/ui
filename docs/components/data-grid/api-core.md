# Core API

Three ES modules under `components/data-grid/core/`. Zero dependencies, no DOM,
no framework, no router. They take and return `URLSearchParams`, so the same
code runs in a browser, in Node and in an edge runtime — which is the point:
the client and the server parse a shared link identically.

```js
import { readGridParams, writeGridParams, applyChange } from "./core/url-state.mjs";
```

Nothing here throws on bad input. Every function degrades to a sensible default
instead, because its input is a URL and a URL is untrusted.

## Types

```ts
type SortDirection = "asc" | "desc";
type DisplayMode = "table" | "cards";
type FieldType = "text" | "enum" | "boolean" | "date" | "number";

interface SortSpec {
  field: string;
  direction: SortDirection;
}

interface FilterCondition {
  field: string;
  operator: string;
  values: string[];
}

interface FilterGroup {
  conjunction: "and" | "or";
  conditions: FilterCondition[];
}

interface GridQuery {
  q: string;
  segment?: string;
  filter: FilterGroup;
  sort: SortSpec[];
  page: number; // one-based
  pageSize: number;
  display: DisplayMode;
}

type GridChange =
  "search" | "filter" | "segment" | "sort" | "page" | "pageSize" | "display" | "reset";
```

These are JSDoc typedefs in the source, not a `.d.ts`. The React build declares
its own TypeScript interfaces for the parts it exposes.

---

## `core/url-state.mjs`

The URL contract. Most applications need only this file's exports.

### `readGridParams(namespace, search, opts?)`

```ts
function readGridParams(
  namespace: string,
  search: URLSearchParams,
  opts?: {
    sortableFields?: Set<string>;
    filterFields?: Map<string, FieldType>;
    segmentIds?: string[];
  },
): { query: GridQuery; droppedFilterFields: string[] };
```

Parses and validates a query out of search params.

| Parameter             | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `namespace`           | The URL prefix, e.g. `"bk"` for `bk_q`, `bk_page`              |
| `search`              | Any `URLSearchParams` — from a browser, a request, or a string |
| `opts.sortableFields` | Field ids that may appear in `_sort`. Others are dropped       |
| `opts.filterFields`   | Field id → type. Used to validate every filter condition       |
| `opts.segmentIds`     | Declared segment ids. An undeclared `_seg` is dropped          |

Omit an option and that dimension is not validated. On a client, omitting
`sortableFields` means a stale link can send a renamed column to your database.

**Returns** the validated query and the names of any filter fields that were
dropped — surface those, do not swallow them. See
[Filtering](/components/data-grid/filtering#dropped-fields).

```js
const { query, droppedFilterFields } = readGridParams("bk", new URLSearchParams(location.search), {
  sortableFields: new Set(["title", "price"]),
  filterFields: new Map([["genre", "enum"]]),
  segmentIds: ["all", "in-stock"],
});
```

### `writeGridParams(namespace, query, base?)`

```ts
function writeGridParams(
  namespace: string,
  query: GridQuery,
  base?: URLSearchParams | string,
): URLSearchParams;
```

Serialises a query, **omitting every value that equals its default**. A default
query writes nothing at all:

```js
writeGridParams("bk", DEFAULT_QUERY).toString(); // ""
```

`base` is merged into rather than replaced, so unrelated parameters — a second
grid, a drawer, a campaign tag — survive:

```js
writeGridParams("bk", query, new URLSearchParams(location.search));
```

Search text is trimmed on write. Note that `URLSearchParams` percent-encodes the
colon in `_sort`, so a generated link carries `bk_sort=price%3Adesc`; both forms
parse.

It does **not** write `_sel` — see [`URL_SUFFIX`](#url-suffix).

### `applyChange(next, change)` {#applychange}

```ts
function applyChange(
  next: Partial<GridQuery>,
  change: GridChange,
): { query: GridQuery; history: "push" | "replace"; dropSelection: boolean };
```

Normalises the next query and derives its consequences. This is where the reset
rules live, so no feature has to remember them.

```js
const { query, history, dropSelection } = applyChange({ ...current, q: "brontë" }, "search");
// query.page === 1, history === "replace", dropSelection === true
```

| `change`   | `query.page` | `dropSelection` | `history` |
| ---------- | ------------ | --------------- | --------- |
| `search`   | reset to 1   | `true`          | `replace` |
| `filter`   | reset to 1   | `true`          | `replace` |
| `segment`  | reset to 1   | `true`          | `push`    |
| `sort`     | reset to 1   | `false`         | `replace` |
| `pageSize` | reset to 1   | `false`         | `replace` |
| `page`     | kept         | `false`         | `push`    |
| `display`  | kept         | `false`         | `replace` |
| `reset`    | reset to 1   | `true`          | `replace` |

### `clearNamespace(namespace, base?)`

```ts
function clearNamespace(namespace: string, base?: URLSearchParams | string): URLSearchParams;
```

Deletes every parameter this contract defines for `namespace` — including
`_sel` — and nothing else. A second grid's state and the rest of the query
string survive.

### `buildGridUrl(pathname, namespace, query, base?)`

```ts
function buildGridUrl(
  pathname: string,
  namespace: string,
  query: GridQuery,
  base?: URLSearchParams | string,
): string;
```

A shareable link to an exact view, for a "Copy link" button or a scheduled
report. Returns the bare pathname when the query is entirely at its defaults,
rather than a trailing `?`.

### `param(namespace, suffix)`

```ts
function param(namespace: string, suffix: keyof typeof URL_SUFFIX): string;
```

```js
param("bk", "page"); // "bk_page"
param("bk", "pageSize"); // "bk_size"
```

The `suffix` argument is the **key** in `URL_SUFFIX`, not the string that ends
up in the URL.

### `URL_SUFFIX` {#url-suffix}

```js
{
  query: "q",
  segment: "seg",
  filter: "fx",
  sort: "sort",
  page: "page",
  pageSize: "size",
  display: "view",
  selected: "sel",  // the open row, by STABLE id — never a row index
}
```

`selected` is **reserved, not implemented**. It is named here and deleted by
`clearNamespace`, so it participates in reset, but neither `readGridParams` nor
`writeGridParams` touches it. Opening a row is your application's job.

---

## `core/query.mjs`

Defaults, normalisation, and the rules that `applyChange` composes. Import from
here when you want a rule on its own.

### Constants

| Export              | Value                                    | Notes                                                     |
| ------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `PAGE_SIZE_OPTIONS` | `[10, 25, 50, 100, 200]`                 | The allow-list. A `_size` outside it falls back           |
| `MAX_PAGE_SIZE`     | `200`                                    | Exported for your data layer; the core clamps by the list |
| `MAX_SORT_FIELDS`   | `3`                                      | Extra sort fields are truncated, not rejected             |
| `DEFAULT_QUERY`     | see below                                | What `writeGridParams` omits                              |
| `EMPTY_FILTER`      | `{ conjunction: "and", conditions: [] }` | Re-exported from `filter-model.mjs`                       |

```js
export const DEFAULT_QUERY = {
  q: "",
  segment: undefined,
  filter: EMPTY_FILTER,
  sort: [],
  page: 1,
  pageSize: 25,
  display: "table",
};
```

`MAX_PAGE_SIZE` is a ceiling for your own validation — the core enforces
membership of `PAGE_SIZE_OPTIONS`, which is stricter. Use it when your API
accepts arbitrary sizes and needs one number to refuse above.

### `normalizeQuery(input?)`

```ts
function normalizeQuery(input?: Partial<GridQuery> | Record<string, unknown>): GridQuery;
```

Clamps anything into a usable query. **Never throws.**

| Input                                 | Result          |
| ------------------------------------- | --------------- |
| `q` not a string                      | `""`            |
| `segment` empty or not a string       | `undefined`     |
| `filter` without a `conditions` array | `EMPTY_FILTER`  |
| `sort` not an array                   | `[]`            |
| `sort` longer than 3                  | truncated to 3  |
| `page` `< 1`, `NaN`, fractional       | `1`, or floored |
| `pageSize` not in the options         | `25`            |
| `display` not `"cards"`               | `"table"`       |

It does not validate sort _field names_ — that needs the grid's declared fields,
so it happens in `readGridParams`.

### `changeResetsPage(change)`

```ts
function changeResetsPage(change: GridChange): boolean;
```

`true` for `search`, `filter`, `segment`, `sort`, `pageSize`, `reset`.

### `changeDropsSelection(change)`

```ts
function changeDropsSelection(change: GridChange): boolean;
```

`true` for `search`, `filter`, `segment`, `reset` — the changes that alter the
predicate an "all matching" selection was made against.

### `historyModeFor(change)`

```ts
function historyModeFor(change: GridChange): "push" | "replace";
```

`"push"` for `page` and `segment`; `"replace"` for everything else.

### `sameQuery(a, b)`

```ts
function sameQuery(a: GridQuery, b: GridQuery): boolean;
```

Deep-enough equality to decide whether a URL write is needed at all. Compares
the scalars directly and `sort`/`filter` by JSON, so key order in a
hand-constructed filter matters. Neither shipped build uses it; it is there for
bindings that want to skip redundant history entries.

---

## `core/filter-model.mjs`

The typed filter model. Full explanation on
[Filtering](/components/data-grid/filtering).

### `OPERATORS_BY_TYPE`

```js
{
  text:    ["contains", "not_contains", "is", "is_not", "is_set", "is_not_set"],
  enum:    ["in", "not_in", "is_set", "is_not_set"],
  boolean: ["is"],
  date:    ["before", "after", "is", "is_set", "is_not_set"],
  number:  ["is", "is_not", "gt", "gte", "lt", "lte"],
}
```

### `VALUELESS_OPERATORS`

```js
new Set(["is_set", "is_not_set"]);
```

Operators that are complete on their own. Every other operator requires at least
one value; a condition arriving without one is dropped and reported.

### `EMPTY_FILTER` / `isEmptyFilter(filter)`

```ts
const EMPTY_FILTER: FilterGroup;
function isEmptyFilter(filter: FilterGroup | null | undefined): boolean;
```

`isEmptyFilter` tolerates `null`, `undefined`, and an object with no
`conditions` array, because a decoder can hand you any of those.

### `encodeFilter(filter)`

```ts
function encodeFilter(filter: FilterGroup): string | null;
```

Returns `1.<base64url>`, or `null` for an empty filter (which is why an empty
filter never reaches the URL). The payload is a positional tuple array encoded
through `TextEncoder`, not `btoa` — `btoa` throws above U+00FF and would break
any shared link containing "Zürich" or "日本".

```js
encodeFilter({
  conjunction: "and",
  conditions: [{ field: "genre", operator: "in", values: ["fiction"] }],
});
// "1.WyJhbmQiLFtbImdlbnJlIiwiaW4iLFsiZmljdGlvbiJdXV1d"
```

### `decodeFilter(raw, fields?)`

```ts
function decodeFilter(
  raw: string | null,
  fields?: Map<string, FieldType>,
): { filter: FilterGroup; dropped: string[] };
```

Validates every condition against the fields the grid actually declares and
reports the ones it removed. Never throws.

Returns an empty filter with **no** dropped names when the input is longer than
2048 characters, has a missing or non-`1` version prefix, is malformed base64 or
JSON, or decodes to the wrong structure — there is nothing meaningful to name in
those cases.

Pass no `fields` and field and operator validation is skipped; the structural
checks still apply.

### `describeCondition(condition, field?)`

```ts
function describeCondition(
  condition: FilterCondition,
  field?: { label?: string; options?: { value: string; label?: string }[] },
): string;
```

Chip text, in the user's vocabulary rather than in database identifiers.

```js
describeCondition({ field: "genre", operator: "in", values: ["fiction", "history"] }, genreField);
// "Genre is any of Fiction, History"
```

More than two values collapse to `"a, b +2"`. Valueless operators drop the value
section: `"Note is not set"`. With no `field`, it falls back to the raw ids —
which is what happens for a field the grid no longer declares.

## Related

- [URL State](/components/data-grid/url-state) — what these functions are for
- [Filtering](/components/data-grid/filtering) — the model in depth
- [React API](/components/data-grid/api-react) ·
  [Vanilla API](/components/data-grid/api-vanilla) — the bindings
