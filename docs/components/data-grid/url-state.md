# URL State

This is the component. Everything else — the toolbar, the chips, the seven
states — is rendering. The part worth copying is the contract described here,
and it lives in three files under `core/` that have no dependencies, no DOM, and
no knowledge of your router.

## The query

One object describes what the user is asking for:

```ts
interface GridQuery {
  q: string; // free-text search
  segment?: string; // a named built-in subset
  filter: FilterGroup; // the typed filter model
  sort: SortSpec[]; // ordered; first entry is primary
  page: number; // ONE-based, because it is user-visible
  pageSize: number;
  display: "table" | "cards";
}
```

`page` is one-based on purpose. It appears in the address bar and in "Page 3 of
12", and a URL that says `page=0` for the first page is a bug report waiting to
be filed. The conversion to a zero-based offset belongs in your data layer,
where exactly one function has to know about it.

The defaults:

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

## The parameters

Every parameter is `<namespace>_<suffix>`.

| Parameter | Holds                                    | Omitted when |
| --------- | ---------------------------------------- | ------------ |
| `_q`      | search text                              | empty        |
| `_seg`    | segment id                               | unset        |
| `_fx`     | the encoded filter model                 | no filters   |
| `_sort`   | `field:dir,field2:dir`, max three fields | unsorted     |
| `_page`   | one-based page number                    | page 1       |
| `_size`   | rows per page                            | at default   |
| `_view`   | `table` or `cards`                       | `table`      |
| `_sel`    | the open row or drawer, by stable id     | closed       |

So a grid with namespace `bk` uses `bk_q`, `bk_page`, `bk_sort`, and so on:

```
/books?bk_q=bront%C3%AB&bk_sort=price:desc&bk_page=2&bk_size=50
```

The suffixes are fixed across every grid in the collection. Somebody who learns
one grid's URL can read every other grid's URL in the same product, which is
worth more than a per-screen abbreviation that reads slightly better in
isolation.

::: info `_sel` is reserved, not implemented
`URL_SUFFIX.selected` names the parameter and `clearNamespace()` deletes it, so
it participates in reset and cannot be squatted on by anything else. But
`writeGridParams()` does not write it and `readGridParams()` does not read it —
opening a row is your application's job, and only you know what a row's stable
id is. The contract reserves the slot so that when you do wire a drawer, it
resets with the rest of the grid instead of surviving a reset and reopening a
row the user has filtered away.
:::

`_sel` says **stable id**, never a row index. A row index is meaningless the
moment the sort changes, and a link that opens the wrong record is worse than a
link that opens nothing.

## Namespaces

The prefix exists so two grids can share one route without fighting over `page`.

```js
readGridParams("invoices", search); // invoices_q, invoices_page…
readGridParams("contacts", search); // contacts_q, contacts_page…
```

`writeGridParams` takes an optional `base` of existing params and merges into it,
so writing one grid's state never disturbs the other grid's state — or a
campaign tag, or a drawer parameter belonging to the page rather than the grid:

```js
const next = writeGridParams("invoices", query, new URLSearchParams(location.search));
// contacts_page and utm_source survive untouched
```

Pick a short namespace. It appears in every link your users share, and
`bk_page=2` is easier to read past than `bookshop_stock_list_page=2`.

## The six rules

These are the substance. Each of them is a bug that a grid without them
eventually ships.

### 1. Validate everything — a URL is untrusted input

A URL can be hand-edited, truncated by a chat client, mangled by a link
rewriter, or five versions out of date in someone's bookmarks. Every value is
clamped or dropped on the way in, and nothing throws.

| In the URL             | What happens                              |
| ---------------------- | ----------------------------------------- |
| `_page=-5`             | clamps to `1`                             |
| `_page=abc`            | falls back to `1`                         |
| `_size=99999`          | falls back to the default page size       |
| `_sort=evil:asc`       | unknown field dropped, sort ends up empty |
| `_sort=name:sideways`  | direction falls back to `asc`             |
| `_fx=notbase64`        | filter ignored entirely                   |
| `_seg=ghost`           | undeclared segment dropped                |
| `_view=hologram`       | falls back to `table`                     |
| four sort fields given | truncated to three                        |

The rule everywhere is that malformed input **degrades** rather than producing an
error page. An old link showing the default view is a minor annoyance; an old
link showing a crash is a support ticket, and the person filing it will have no
idea their bookmark was the cause.

Validation needs to know what this grid actually has, so `readGridParams` takes
the declared fields:

```js
const { query, droppedFilterFields } = readGridParams("bk", new URLSearchParams(location.search), {
  sortableFields: new Set(["title", "author", "price"]),
  filterFields: new Map([
    ["genre", "enum"],
    ["added", "date"],
  ]),
  segmentIds: ["all", "in-stock"],
});
```

Omit an option and that dimension is not validated — `sortableFields` left out
means any sort field is accepted. That is occasionally what you want on a server
that will validate against a real schema anyway, but on a client it is how a
renamed column turns into a database error.

### 2. Report what was dropped

Dropping a filter silently is the failure this rule exists to prevent. Somebody
shares a link that says "overdue invoices, Manchester office". The `office`
field was renamed last month. The recipient opens the link and sees **all**
invoices — not an error, not a warning, just a different result set than the one
they were sent. Neither person finds out.

So `readGridParams` returns the names it dropped:

```js
const { query, droppedFilterFields } = readGridParams("bk", search, opts);
// droppedFilterFields: ["office"]
```

Both builds render that as a warning chip in the filter row — `"1 filter from
this link no longer exists"` — with `role="status"` so it is announced, not just
drawn. If you build your own rendering, render something. The details are on
[Filtering](/components/data-grid/filtering#dropped-fields).

### 3. Omit defaults

A fresh grid writes **nothing**:

```js
writeGridParams("bk", DEFAULT_QUERY).toString(); // ""
```

This is not tidiness. Every parameter you write into a URL becomes part of your
product's public navigation API. It ends up in bookmarks, in tickets, in emails,
in somebody's automation — and each one is a commitment to keep supporting the
name and the meaning. Writing `bk_page=1&bk_size=25&bk_view=table` on an
untouched grid commits you to three parameters that carry no information at all.

It also means "is this grid in a non-default state?" is answerable by looking at
the query string, which is how the **Reset** button knows whether to appear.

### 4. Reset in one place

Two consequences follow automatically from a change, and both live in
`applyChange` rather than being remembered at every call site:

**Changing the result set returns to page 1.** Search, filter, segment, sort,
page size and reset all do this. Without it, searching for something that matches
three rows while you are on page 7 shows an empty grid — and the emptiness reads
as "no matches" rather than "wrong page".

**Changing the predicate drops an all-matching selection.** Search, filter,
segment and reset do this. A "select everything matching this query" selection is
a _predicate_, not a list of ids. The moment the predicate changes, that
selection means something the user never agreed to, so it is dropped rather than
reinterpreted.

```js
const { query, history, dropSelection } = applyChange({ ...current, q: "brontë" }, "search");
// query.page === 1, history === "replace", dropSelection === true
```

Scattered `delete("page")` calls are how you end up with a grid where changing
the filter resets the page but changing the segment does not, and nobody on the
team can say whether that was deliberate.

The change values are:
`"search" | "filter" | "segment" | "sort" | "page" | "pageSize" | "display" | "reset"`.
You say **what happened**; the core decides what follows.

| Change     | Resets page | Drops selection | History   |
| ---------- | ----------- | --------------- | --------- |
| `search`   | yes         | yes             | `replace` |
| `filter`   | yes         | yes             | `replace` |
| `segment`  | yes         | yes             | **push**  |
| `sort`     | yes         | no              | `replace` |
| `pageSize` | yes         | no              | `replace` |
| `page`     | no          | no              | **push**  |
| `display`  | no          | no              | `replace` |
| `reset`    | yes         | yes             | `replace` |

### 5. Push versus replace

Paging and switching segment **push** a history entry, because those are
navigations a user expects Back to undo. Search, filter, sort, page size and
display mode **replace**, because those are refinements of where you already are.

Getting this wrong is very visible. If every keystroke of the search box pushes,
Back has to be pressed once per character to escape the grid, and a user who
typed a nine-letter query is effectively trapped on the page.

The rule is exported on its own if you want it without the rest:

```js
import { historyModeFor } from "./core/query.mjs";
historyModeFor("page"); // "push"
historyModeFor("search"); // "replace"
```

`sort` replacing is the one people argue about. It is a refinement of the same
list — you are still looking at the same rows — and users who sort do it several
times in a row while comparing. Pushing would bury the page they arrived from
under four entries.

### 6. Reset touches only its own namespace

```js
clearNamespace("bk", new URLSearchParams(location.search));
```

Deletes every `bk_*` parameter this contract defines — including `bk_sel` — and
nothing else. A second grid's state, a drawer parameter, a campaign tag: all
survive.

Resetting a grid by clearing the whole query string works perfectly until the
day someone puts two grids on one page, at which point resetting one silently
resets the other. That bug is easy to write and unpleasant to find, because the
page it happens on is not the page anyone was testing.

## Encoding details

**Sort** is `field:dir`, comma-separated, capped at three fields:

```
bk_sort=price:desc,title:asc
```

Readable in a pasted link, which matters more than saving four characters.
Three is a deliberate ceiling: sorting by more than a few columns is unreadable
for a user and slow to index for a database. Extra fields are truncated, not
rejected.

::: warning The shipped UI writes one sort field
Both builds' column headers replace the sort array rather than appending to it,
so clicking headers produces a single-field sort. The core reads, validates and
round-trips up to three, so multi-field sorts arriving from a link or from your
own code work correctly — but there is no built-in shift-click gesture to
create one.
:::

**Filter** is `1.<base64url>` of a positional tuple array. The full explanation,
including why it is `TextEncoder` and not `btoa`, is on
[Filtering](/components/data-grid/filtering#encoding).

**Search** is a plain value, URL-encoded by `URLSearchParams`. It is trimmed on
write, so trailing spaces do not produce a URL that differs from an identical
search typed slightly differently.

## Reading the URL on a server

`core/` has no DOM and no framework. It runs in Node and in edge runtimes, which
means the server can parse an incoming link with the same code that produced it:

```js
// A Next.js App Router server component, a Remix loader, an Express handler —
// the shape of the surrounding code changes, this part does not.
import { readGridParams } from "./core/url-state.mjs";

const { query, droppedFilterFields } = readGridParams("bk", new URLSearchParams(url.search), {
  sortableFields: new Set(SORTABLE),
  filterFields: FILTER_TYPES,
  segmentIds: SEGMENTS.map((s) => s.id),
});

const rows = await db.books.findMany({
  skip: (query.page - 1) * query.pageSize,
  take: query.pageSize,
  orderBy: query.sort.map((s) => ({ [s.field]: s.direction })),
});
```

This is the reason the parsing lives in a dependency-free module rather than
inside a React hook. If the client clamps `page=0` to 1 and the server treats it
as offset 0, the two agree by luck. If the client drops an unknown sort field and
the server passes it to the database, a stale bookmark returns a 500. Sharing the
code removes the whole category.

## Deep links

Everything the grid does is expressible as a link. Some worked examples, all for
a grid with namespace `bk`:

**A saved search.**

```
/books?bk_q=bront%C3%AB
```

**Second page of a bigger page size.**

```
/books?bk_page=2&bk_size=50
```

**Most expensive first.**

```
/books?bk_sort=price:desc
```

**A segment, sorted, on page three.**

```
/books?bk_seg=in-stock&bk_sort=title:asc&bk_page=3
```

**Two grids on one route, neither disturbing the other.**

```
/dashboard?inv_seg=overdue&inv_page=2&con_q=manchester&utm_source=digest
```

To build one in code — for a "Copy link" button, an email, a scheduled report:

```js
import { buildGridUrl } from "./core/url-state.mjs";

buildGridUrl("/books", "bk", {
  ...DEFAULT_QUERY,
  q: "brontë",
  sort: [{ field: "price", direction: "desc" }],
});
// "/books?bk_q=bront%C3%AB&bk_sort=price%3Adesc"
```

The colon comes back as `%3A` because that is what `URLSearchParams` does when
it serialises. The parameters above are written the readable way throughout this
page — `bk_sort=price:desc` — because both forms decode to the same thing and a
hand-typed colon works. Machine-generated links will carry `%3A`.

`buildGridUrl` returns the bare pathname when the query is entirely at its
defaults, so a "copy link to this view" button on an untouched grid produces a
clean URL rather than a bare `?`.

## What is deliberately not in the URL

**Selection.** Row selection is page-local and lives in memory. Putting it in
the URL would mean a link that carries "these fourteen ids are selected" into a
context where the recipient may not have permission to see all fourteen, and
would make the URL grow without bound.

**Scroll position, column widths, expanded rows.** These are view ergonomics
rather than what the user is asking for, and every one you add is another
parameter you have committed to supporting forever. Rule 3 applies to your own
extensions too.

**Anything secret.** URLs end up in browser history, server logs, referrer
headers and screenshots. The grid never writes a token or a row's contents into
the address bar, and neither should the fields you declare.
