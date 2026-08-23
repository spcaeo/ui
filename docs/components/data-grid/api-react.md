# React API

`components/data-grid/react/data-grid.tsx` — one component, two hooks, zero
dependencies beyond React.

```tsx
import { DataGrid, useGridData, useGridUrlState } from "./data-grid";
```

The file begins with `"use client"`. It uses state, effects, the History API and
event handlers, so it has to. In the Next.js App Router, import it from a server
component freely — the directive marks the boundary.

It imports from `../core/url-state.mjs`, so `core/` must sit beside `react/`
exactly as it does in the repository. See
[Installation](/components/data-grid/installation#path-3-react).

## The three pieces

The split is deliberate. `useGridUrlState` owns the address bar, `useGridData`
owns fetching, and `<DataGrid>` renders. Each can be replaced without touching
the others — you can keep the component and fetch with React Query, or keep the
hooks and render your own table.

```tsx
"use client";
import { DataGrid, useGridData, useGridUrlState } from "./data-grid";

const COLUMNS = [
  { id: "title", label: "Title", sortable: true },
  { id: "author", label: "Author", sortable: true },
  {
    id: "price",
    label: "Price",
    align: "right",
    sortable: true,
    render: (row) => `£${row.price.toFixed(2)}`,
  },
];

const FILTERS = [
  {
    id: "genre",
    label: "Genre",
    type: "enum",
    options: [
      { value: "fiction", label: "Fiction" },
      { value: "history", label: "History" },
    ],
  },
];

export function Books() {
  const { query, droppedFilterFields, setQuery, resetAll } = useGridUrlState({
    namespace: "bk",
    sortableFields: ["title", "author", "price"],
    filterFields: new Map([["genre", "enum"]]),
    segmentIds: ["all", "in-stock"],
  });

  const { status, rows, total, error, refresh } = useGridData(query, async (q, signal) => {
    const res = await fetch(`/api/books?${q.searchParams}`, { signal });
    if (!res.ok) {
      throw Object.assign(new Error("Load failed"), {
        code: "GRID_QUERY_FAILED",
        requestId: res.headers.get("x-request-id"),
      });
    }
    return res.json(); // { rows, total }
  });

  const [selection, setSelection] = React.useState(new Set<string>());

  return (
    <DataGrid
      namespace="bk"
      columns={COLUMNS}
      filters={FILTERS}
      segments={[
        { id: "all", label: "All" },
        { id: "in-stock", label: "In stock" },
      ]}
      rows={rows}
      total={total}
      status={status}
      error={error}
      query={query}
      onQueryChange={setQuery}
      onReset={resetAll}
      onRetry={refresh}
      droppedFilterFields={droppedFilterFields}
      selectable
      selection={selection}
      onSelectionChange={setSelection}
      emptyMessage="No titles have been added to this shop yet."
      searchPlaceholder="Search title, author or ISBN…"
    />
  );
}
```

---

## `useGridUrlState(config)`

```ts
function useGridUrlState(config: UseGridUrlStateConfig): {
  query: GridQuery;
  droppedFilterFields: string[];
  setQuery: (
    next: Partial<GridQuery>,
    change: GridChange,
  ) => {
    query: GridQuery;
    history: "push" | "replace";
    dropSelection: boolean;
  };
  resetAll: () => void;
};
```

Binds the grid's query to the address bar.

### `UseGridUrlStateConfig`

| Field            | Type                  | Description                                          |
| ---------------- | --------------------- | ---------------------------------------------------- |
| `namespace`      | `string`              | URL prefix. Two grids on one route must not share it |
| `sortableFields` | `string[]`            | Field ids allowed in `_sort`. Others are dropped     |
| `filterFields`   | `Map<string, string>` | Field id → type, used to validate `_fx`              |
| `segmentIds`     | `string[]`            | Declared segments. An undeclared `_seg` is dropped   |

::: warning Define these outside the component
`filterFields` and `segmentIds` are dependencies of the hook's read callback and
are compared by reference. A `new Map([…])` written inline in the render body is
a new object every render. Hoist them to module scope, or wrap them in
`useMemo`. (`sortableFields` is memoised into a `Set` internally, but the array
you pass is itself a dependency, so hoist that too.)
:::

### Returns

**`query`** — the validated `GridQuery` read from the URL.

**`droppedFilterFields`** — filter field names in the URL that this grid no
longer declares. Pass it to `<DataGrid>`; it renders the warning chip.

**`setQuery(next, change)`** — writes the next query to the address bar and
returns what `applyChange` decided, so a caller can act on `dropSelection`:

```tsx
const result = setQuery({ ...query, q: text }, "search");
if (result.dropSelection) setSelection(new Set());
```

Reset rules and history mode come from the core, so `"search"` returns to page 1
and replaces history without you asking. The change values are listed on
[Core API](/components/data-grid/api-core#applychange).

**`resetAll()`** — clears every parameter in this namespace and nothing else.

### Why native history, not the router

`setQuery` calls `history.pushState` / `history.replaceState` directly rather
than `router.replace()`.

In the Next.js App Router, `router.replace()` re-runs your server components on
**every keystroke** of the search box. The native call updates the address bar
and lets the client re-render, which is what rapid refinement needs.

The trade-off is real and worth stating: server components do not observe the
new search params until a real navigation. So the initial server render must
read the URL itself — which it can, because `core/` runs on a server. See
[URL State](/components/data-grid/url-state#reading-the-url-on-a-server).

The hook listens for `popstate`, so Back and Forward re-read the URL and
re-render correctly.

::: tip One hook per grid
The hook reads `window.location.search` and writes it back. Two grids on one
route each call it with their own namespace; the merge in `writeGridParams`
keeps them from clobbering each other.
:::

---

## `useGridData(query, load)`

```ts
function useGridData<T>(
  query: GridQuery,
  load: (
    q: GridQuery & { searchParams: string },
    signal: AbortSignal,
  ) => Promise<{ rows: T[]; total?: number }>,
): {
  status: "loading" | "refreshing" | "ready" | "error";
  rows: T[];
  total: number | null;
  error: GridError | null;
  refresh: () => void;
};
```

Fetches rows for a query and cancels anything already in flight.

Re-runs whenever the query changes — compared by `JSON.stringify`, so a query
object rebuilt with the same values does not re-fetch. `load` is held in a ref,
so you can define it inline without causing a fetch loop.

**`status`** distinguishes the first load from a refresh: `loading` when a
request starts with no rows on screen, `refreshing` when rows are already there.
They must look different, because replacing rows with a skeleton on every
refresh throws away what the person was reading. See
[States](/components/data-grid/states).

**`total`** is `null` when your `load` does not return one. The grid then shows
`"1–25 shown"` instead of `"1–25 of 248"`, and the Next button is enabled based
on whether a full page came back. Returning a real `total` is better; `null` is
there for endpoints that genuinely cannot count.

**Aborting.** Each run creates an `AbortController` and aborts the previous one.
An aborted request never touches state, so a slow first response cannot
overwrite a fast second one — the classic bug where the grid ends up showing
results for a search the user has already changed.

### `q.searchParams` {#q-searchparams}

`load` receives the query plus a `searchParams` string, so your endpoint reads
one vocabulary.

::: warning The React build serialises with an empty namespace
`useGridData` builds `searchParams` with `writeGridParams("", query)`, so the
keys are `_q`, `_page`, `_sort` — **not** `bk_q`, `bk_page`. The vanilla build
uses the grid's namespace and produces `bk_q=…`.

Pick one on the server and be consistent. The unprefixed form is arguably the
better API contract — an endpoint should not care what a page called its grid —
but if you are running both builds against one endpoint, normalise, or serialise
yourself from the `query` object you also receive.
:::

### Throwing a useful error

```tsx
throw Object.assign(new Error("Load failed"), {
  code: "GRID_QUERY_FAILED", // stable, searchable
  requestId: res.headers.get("x-request-id"),
});
```

`code` and `requestId` are rendered under the error state and are what **Copy
error details** puts on the clipboard. Use a stable code, not the raw exception
message — the code is what a support agent recognises, and it must not change
when someone rewords an exception.

---

## `<DataGrid />`

Presentational. It holds no query state and fetches nothing.

### `DataGridProps<T>`

| Prop                  | Type                                              | Default               | Description                                   |
| --------------------- | ------------------------------------------------- | --------------------- | --------------------------------------------- |
| `namespace`           | `string`                                          | —                     | Used for popover ids and the error diagnostic |
| `columns`             | `GridColumn<T>[]`                                 | —                     | Required                                      |
| `filters`             | `GridFilterField[]`                               | `[]`                  | One menu per entry                            |
| `segments`            | `GridSegment[]`                                   | `[]`                  | The strip above the toolbar                   |
| `rows`                | `T[]`                                             | —                     | The current page's rows                       |
| `total`               | `number \| null`                                  | `null`                | Total matching rows, for the count and paging |
| `status`              | `"loading" \| "refreshing" \| "ready" \| "error"` | —                     | From `useGridData`                            |
| `error`               | `GridError \| null`                               | `null`                | Rendered as code · request id                 |
| `query`               | `GridQuery`                                       | —                     | From `useGridUrlState`                        |
| `onQueryChange`       | `(next, change) => void`                          | —                     | Normally `setQuery`                           |
| `onReset`             | `() => void`                                      | —                     | Shows the Reset button when provided          |
| `onRetry`             | `() => void`                                      | —                     | Shows Try again on the error state            |
| `droppedFilterFields` | `string[]`                                        | `[]`                  | Renders the warning chip                      |
| `getRowId`            | `(row: T) => string`                              | `(row) => row.id`     | Stable id for keys and selection              |
| `selectable`          | `boolean`                                         | `false`               | Adds the checkbox column                      |
| `selection`           | `Set<string>`                                     | empty set             | Controlled: you own the state                 |
| `onSelectionChange`   | `(next: Set<string>) => void`                     | —                     | Required for selection to do anything         |
| `emptyMessage`        | `string`                                          | `"Nothing here yet."` | Body of the empty state                       |
| `searchPlaceholder`   | `string`                                          | `"Search…"`           | Also the search input's `aria-label`          |

### `GridColumn<T>`

```ts
interface GridColumn<T> {
  id: string; // also the key read off the row, and the sort field
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
  render?: (row: T) => React.ReactNode;
}
```

Without `render`, the cell shows `row[column.id]`, or an em dash when that is
nullish. Use `align: "right"` for numbers — it adds `.dg-num`, which
right-aligns and applies tabular figures.

`id` doubles as the sort field sent to your API, so it should be a name your
data layer recognises.

### `GridFilterField`

```ts
interface GridFilterField {
  id: string;
  label: string;
  type?: "enum" | "text" | "number" | "date" | "boolean";
  options?: { value: string; label?: string }[];
}
```

The shipped menu is a multi-select checkbox list that writes `operator: "in"`
and reads `options`. `type` is used to validate what arrives from a URL; it does
not currently change the menu. See
[Filtering](/components/data-grid/filtering#what-the-shipped-filter-ui-produces).

### `GridSegment`

```ts
interface GridSegment {
  id: string;
  label: string;
  count?: number;
}
```

The **first** segment is the default: selecting it clears `_seg` rather than
writing it, so the default view keeps a clean URL.

### `GridError`

```ts
interface GridError {
  code?: string;
  requestId?: string;
  message?: string;
}
```

`message` is part of the type but is not rendered — the error state's wording is
fixed, because "This is not a count of zero" is the sentence that has to appear
and a raw exception message would replace it with something less useful.

### Selection is controlled

`selection` and `onSelectionChange` are a controlled pair. Without
`onSelectionChange` the checkboxes render and do nothing.

The grid does not clear the selection for you when the predicate changes —
`setQuery` returns `dropSelection` and you act on it:

```tsx
const change = (next, kind) => {
  const result = setQuery(next, kind);
  if (result.dropSelection) setSelection(new Set());
};
```

---

## Behaviour worth knowing

**Search is debounced at 250 ms.** The input is uncontrolled-ish: it keeps a
local draft and commits after the pause, so typing is never blocked by a
re-render. <kbd>Escape</kbd> clears it.

**Sorting is single-field.** Clicking a header replaces the sort array. The core
reads and round-trips up to three fields, so a multi-field sort from a link
works; there is no shift-click gesture to create one.

**The pagination row is hidden in the error state**, because "0 of 0" beneath an
error reintroduces the count the error just said was unknown.

::: warning Two gaps in this build, stated plainly
**`display: "cards"` is not rendered.** `<DataGrid>` always renders a table. The
`_view` parameter round-trips through the URL and the vanilla build honours it,
but this component ignores it.

**There is no result-count live region.** The vanilla build renders one; this
one does not. Render your own alongside the grid — see
[Accessibility](/components/data-grid/accessibility#announcing-results).
:::

## Related

- [Core API](/components/data-grid/api-core) — what the hooks are calling
- [Vanilla API](/components/data-grid/api-vanilla) — the same grid, no framework
- [States](/components/data-grid/states) · [Theming](/components/data-grid/theming) · [Accessibility](/components/data-grid/accessibility)
