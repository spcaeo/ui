# Vanilla API

`components/data-grid/vanilla/data-grid.js` — one exported function, no
framework, no dependencies. A standard ES module, so it runs from a
`<script type="module">` tag with no build step, and equally through a bundler.

```js
import { createDataGrid } from "./vanilla/data-grid.js";
```

A default export is also available:

```js
import createDataGrid from "./vanilla/data-grid.js";
```

It imports from `../core/url-state.mjs`, so `core/` must sit beside `vanilla/`
exactly as it does in the repository. See
[Installation](/components/data-grid/installation#path-2-vanilla-javascript).

## `createDataGrid(host, config)`

```ts
function createDataGrid(host: HTMLElement, config: GridConfig): GridHandle;
```

Builds the whole grid inside `host`, adds the `dg` class to it, reads the
current URL, renders, and calls `config.load`. There is nothing else to call.

```js
const grid = createDataGrid(document.querySelector("#books"), {
  namespace: "bk",
  columns: [
    { id: "title", label: "Title", sortable: true },
    { id: "author", label: "Author", sortable: true },
    {
      id: "price",
      label: "Price",
      align: "right",
      sortable: true,
      render: (row) => `£${row.price.toFixed(2)}`,
    },
  ],
  filters: [
    {
      id: "genre",
      label: "Genre",
      type: "enum",
      options: [
        { value: "fiction", label: "Fiction" },
        { value: "history", label: "History" },
      ],
    },
  ],
  segments: [
    { id: "all", label: "All" },
    { id: "in-stock", label: "In stock" },
  ],
  selectable: true,
  emptyMessage: "No titles have been added to this shop yet.",
  searchPlaceholder: "Search title, author or ISBN…",
  async load(query, signal) {
    const res = await fetch(`/api/books?${query.searchParams}`, { signal });
    if (!res.ok) {
      throw Object.assign(new Error("Load failed"), {
        code: "GRID_QUERY_FAILED",
        requestId: res.headers.get("x-request-id"),
      });
    }
    return res.json(); // { rows, total }
  },
});
```

The host should be an empty element. The grid appends its own children and
`destroy()` empties it.

## Config

| Field               | Type                                           | Default               | Description                                    |
| ------------------- | ---------------------------------------------- | --------------------- | ---------------------------------------------- |
| `namespace`         | `string`                                       | —                     | URL prefix. Two grids on one route must differ |
| `columns`           | `GridColumn[]`                                 | —                     | Required                                       |
| `filters`           | `GridFilterField[]`                            | `[]`                  | One menu per entry                             |
| `segments`          | `GridSegment[]`                                | `[]`                  | The strip above the toolbar                    |
| `getRowId`          | `(row) => string`                              | `(row) => row.id`     | Stable id, used for selection                  |
| `selectable`        | `boolean`                                      | `false`               | Adds the checkbox column                       |
| `load`              | `(query, signal) => Promise<{ rows, total? }>` | —                     | Required                                       |
| `emptyMessage`      | `string`                                       | `"Nothing here yet."` | Body of the empty state                        |
| `searchPlaceholder` | `string`                                       | `"Search…"`           | Also the search input's `aria-label`           |

Validation is derived from what you declare, so there is nothing extra to
configure: sortable fields come from the columns marked `sortable`, filter field
types from `filters` (defaulting to `"enum"`), and segment ids from `segments`.
A URL naming anything you did not declare is cleaned up on the way in.

### `GridColumn`

```ts
{
  id: string;            // also the key read off the row, and the sort field
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
  render?: (row) => string | Node;
}
```

`render` may return a string or a DOM node. A string is set with
`textContent`, never `innerHTML`, so row data cannot inject markup — build a
node when you need markup:

```js
{
  id: "status",
  label: "Status",
  render: (row) => {
    const span = document.createElement("span");
    span.className = `badge badge-${row.status}`;
    span.textContent = row.status;
    return span;
  },
}
```

Without `render`, the cell shows `row[column.id]`, or an em dash when that is
`null`, `undefined` or an empty string. `align: "right"` adds `.dg-num`, which
right-aligns and uses tabular figures.

### `GridFilterField`

```ts
{
  id: string;
  label: string;
  type?: "enum" | "text" | "number" | "date" | "boolean";  // default "enum"
  options?: { value: string; label?: string }[];
}
```

The shipped menu is a multi-select checkbox list that writes `operator: "in"`
and reads `options`. `type` validates what arrives from a URL; it does not
currently change the menu. See
[Filtering](/components/data-grid/filtering#what-the-shipped-filter-ui-produces).

### `GridSegment`

```ts
{
  id: string;
  label: string;
  count?: number;   // rendered as a pill
}
```

The **first** segment is the default: selecting it clears `_seg` rather than
writing it, so the default view keeps a clean URL.

### `load(query, signal)`

```ts
async function load(
  query: GridQuery & { searchParams: string },
  signal: AbortSignal,
): Promise<{ rows: unknown[]; total?: number }>;
```

Called on mount, on every query change, and by `refresh()`.

**`query.searchParams`** is the serialised query — the same vocabulary the
address bar uses, **including the namespace prefix**: `bk_q=brontë&bk_page=2`.
So a deep link and an API call cannot disagree about what `page=2` means,
because they are the same string. (The React build serialises without the
prefix; if you run both against one endpoint, see the note on the
[React API](/components/data-grid/api-react#q-searchparams).)

You also receive the decoded query, so `query.filter.conditions`,
`query.sort` and `query.page` are available directly without re-parsing.

**`signal`** aborts when the request is superseded. Pass it to `fetch`. A
request that aborts never touches state, which is what stops a slow first
response from overwriting a fast second one.

**Return `{ rows, total }`.** Omitting `total` is allowed — the footer then
reads `"1–25 shown"` instead of `"1–25 of 248"`, and Next is enabled based on
whether a full page came back. Returning a real total is better.

**Throw for failure**, with a stable `code` and a `requestId`. Both are rendered
under the error state and are what **Copy error details** puts on the clipboard.
An error with `code: "NETWORK_OFFLINE"` renders the offline wording, so you can
force that state from your own fetch wrapper when you know better than
`navigator.onLine` does. See [States](/components/data-grid/states#error).

## The handle

```ts
interface GridHandle {
  refresh(): void;
  readonly query: GridQuery;
  readonly selection: string[];
  destroy(): void;
}
```

### `refresh()`

Re-runs `load` with the current query, aborting anything in flight. Because rows
are already on screen, this renders as the **refreshing** state — the rows stay
put and a thin sweep runs across the top of the frame — rather than as a
skeleton.

```js
setInterval(() => grid.refresh(), 30_000);
```

### `query`

A getter returning the current `GridQuery`. Read it to build a "Copy link"
button, to mirror the state somewhere else on the page, or to log what people
actually filter by:

```js
import { buildGridUrl } from "./core/url-state.mjs";
copyButton.onclick = () =>
  navigator.clipboard.writeText(buildGridUrl(location.pathname, "bk", grid.query));
```

It is a getter, not a snapshot — read it when you need it rather than caching
it.

### `selection`

A getter returning the selected row ids as an **array** (a copy of the internal
`Set`, so mutating it does nothing).

Selection is page-local and in memory. It is not written to the URL, and it is
cleared automatically when the predicate changes — a new search, filter or
segment — because an "all matching" selection means something different after
the predicate moves. See
[URL State](/components/data-grid/url-state#the-six-rules).

```js
bulkArchive.onclick = () => archive(grid.selection);
```

There is no `onSelectionChange` callback. Read `grid.selection` when your bulk
action fires, or observe the selection bar if you need to react to changes.

### `destroy()`

Aborts the in-flight request, clears the search debounce timer, and empties the
host element.

::: warning `destroy()` does not remove the `popstate` listener
`createDataGrid` attaches a `popstate` listener to `window` and nothing detaches
it. In a long-lived single-page app that creates and destroys many grids, those
listeners accumulate; each one re-reads the URL and re-renders into a host it no
longer owns, which is harmless but not free.

For a page whose grid lives as long as the page — the common case — this does
not matter. If it matters to you, the fix is four lines in
`vanilla/data-grid.js`: name the handler, and remove it in `destroy()`.
:::

## Behaviour worth knowing

**Search is debounced at 250 ms.** One request per keystroke is how you
rate-limit yourself. <kbd>Escape</kbd> in the search field clears it and re-runs
the query immediately.

**Sorting is single-field.** Clicking a header replaces the sort array; clicking
the same header again reverses it. The core reads and round-trips up to three
fields, so a multi-field sort arriving from a link works, but there is no
shift-click gesture to create one.

**Reset** appears in the toolbar only when the search, a filter, or a segment is
set. It calls `clearNamespace`, so another grid's parameters and the rest of the
query string survive.

**Back and Forward work.** The `popstate` listener re-reads the URL, clears the
selection, re-renders and re-fetches.

**Cards mode.** `query.display === "cards"` renders `.dg-cards` — one `<dl>` per
row — instead of the table. Note that cards ignore a column's `render`
function and show the raw value; a column with a custom renderer displays an
empty definition in that mode. The parameter round-trips and the table mode is
unaffected, but cards are the least finished part of this build. There is no
built-in control that switches modes; you set `display` yourself or arrive with
`_view=cards` in the URL.

## Two grids on one page

```js
createDataGrid(document.querySelector("#invoices"), { namespace: "inv", … });
createDataGrid(document.querySelector("#contacts"), { namespace: "con", … });
```

Each writes only its own parameters and merges into whatever is already in the
query string, so paging one grid does not disturb the other, and resetting one
does not clear the other. There is a browser test for it — _"one grid never
clobbers another"_.

## Related

- [Core API](/components/data-grid/api-core) — what this file is calling
- [React API](/components/data-grid/api-react) — the same grid for React
- [States](/components/data-grid/states) · [Theming](/components/data-grid/theming) · [Accessibility](/components/data-grid/accessibility)
