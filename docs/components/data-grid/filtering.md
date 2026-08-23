# Filtering

Filters are the hardest thing to put in a URL. Search is a string and page is a
number, but a filter is a small typed expression that has to survive being
pasted through a chat client, saved in a bookmark for a year, and read back by a
version of your application that has since renamed a field.

`core/filter-model.mjs` handles that in about 150 lines and no dependencies.

## The model

```ts
interface FilterGroup {
  conjunction: "and" | "or";
  conditions: FilterCondition[];
}

interface FilterCondition {
  field: string; // matches a declared filter field's id
  operator: string; // must be legal for that field's type
  values: string[]; // always strings, even for numbers and dates
}
```

The empty filter is the default and is never written to the URL:

```js
export const EMPTY_FILTER = { conjunction: "and", conditions: [] };
```

`isEmptyFilter(filter)` is the test, and it tolerates `null`, `undefined`, and
an object with no `conditions` array — because those are all things a decoder can
hand you on a bad day.

**Values are always strings.** A number filter carries `["100"]`, not `[100]`,
and a date filter carries an ISO string. This is not laziness: everything here
has to round-trip through a URL, where there are only strings, and a model that
is sometimes a number and sometimes the string form of one is a model with two
shapes to test instead of one. Coerce at the edge where you build the database
query, once.

**One level, no nesting.** A `FilterGroup` holds conditions, not other groups.
That is enough for `status is any of (active, trial) AND plan is enterprise`,
which is what a listing screen's filter bar produces. If you need
`(A OR B) AND (C OR D)`, this model will not express it, and a URL is probably
the wrong place to keep it anyway.

## Field types and operators

A filter field declares a type, and the type determines which operators are
legal for it:

```js
export const OPERATORS_BY_TYPE = {
  text: ["contains", "not_contains", "is", "is_not", "is_set", "is_not_set"],
  enum: ["in", "not_in", "is_set", "is_not_set"],
  boolean: ["is"],
  date: ["before", "after", "is", "is_set", "is_not_set"],
  number: ["is", "is_not", "gt", "gte", "lt", "lte"],
};
```

| Operator       | Reads as         | Legal for                   |
| -------------- | ---------------- | --------------------------- |
| `contains`     | contains         | text                        |
| `not_contains` | does not contain | text                        |
| `is`           | is               | text, boolean, date, number |
| `is_not`       | is not           | text, number                |
| `in`           | is any of        | enum                        |
| `not_in`       | is none of       | enum                        |
| `before`       | before           | date                        |
| `after`        | after            | date                        |
| `gt`           | `>`              | number                      |
| `gte`          | `≥`              | number                      |
| `lt`           | `<`              | number                      |
| `lte`          | `≤`              | number                      |
| `is_set`       | is set           | text, enum, date            |
| `is_not_set`   | is not set       | text, enum, date            |

A pairing not in that table is dropped on decode. `genre contains "fic"` is
discarded because `genre` is an enum and `contains` is not one of its operators
— which is exactly what you want when the URL says something your data layer
cannot execute.

### Valueless operators

```js
export const VALUELESS_OPERATORS = new Set(["is_set", "is_not_set"]);
```

These are complete on their own; a value alongside them would be meaningless.
Every **other** operator requires at least one value, and a condition that
arrives with an empty `values` array is dropped and reported. That rule stops a
truncated link from turning `plan is enterprise` into `plan is` — a condition
that is either an error or, worse, silently matches everything.

## Encoding

The encoded form is `1.<base64url>`:

```
bk_fx=1.WyJhbmQiLFtbImdlbnJlIiwiaW4iLFsiZmljdGlvbiIsImhpc3RvcnkiXV1dXQ
```

Three decisions are packed into that.

**A version prefix outside the payload.** The `1.` can be checked without
decoding anything. A filter encoded by a future format, or by a format so old it
predates this one, is recognised and dropped rather than being half-parsed into
something plausible.

**Positional tuples, not objects.** The payload is
`["and", [["genre", "in", ["fiction", "history"]]]]`, not
`{"conjunction":"and","conditions":[{"field":"genre",...}]}`. Same information,
roughly half the characters. URLs get pasted into places that wrap, truncate or
linkify them, and a shorter one survives more of those.

**`TextEncoder`, not `btoa`.** This is the one that bites people:

```js
btoa(JSON.stringify(["and", [["city", "is", ["Zürich"]]]]));
// InvalidCharacterError
```

`btoa` throws on any code point above U+00FF. A filter for "Zürich", "São
Paulo", or "日本" would break the moment someone tried to share it — and it
would break at _share_ time, in someone else's browser, not in your tests. The
encoder runs the JSON through `TextEncoder` first and base64s the bytes, so
every language works:

```js
encodeFilter({
  conjunction: "and",
  conditions: [{ field: "city", operator: "is", values: ["Zürich"] }],
});
// "1.WyJhbmQiLFtbImNpdHkiLCJpcyIsWyJaw7xyaWNoIl1dXV0"
```

There is a contract test for exactly this — _"non-ASCII filter value survives"_ —
because it is the kind of thing that gets refactored away by someone who notices
`btoa` is shorter.

The output is base64**url**: `+` and `/` become `-` and `_`, and the `=` padding
is stripped, so nothing in the value needs percent-encoding on top.

## Decoding

```js
const { filter, dropped } = decodeFilter(raw, fieldsMap);
```

`fieldsMap` is a `Map` of field id to type — the fields **this** grid actually
declares. Every condition is checked against it, and anything that does not
survive is named in `dropped`:

```js
decodeFilter(raw, new Map([["genre", "enum"]]));
// { filter: { conjunction: "and", conditions: [] }, dropped: ["office"] }
```

A condition is dropped when:

- the field is not in the map — it was renamed or removed since the link was
  saved;
- the operator is not legal for that field's type;
- `values` is empty and the operator is not valueless.

Everything else is refused earlier and produces an empty filter with **no**
dropped names, because there is nothing meaningful to name:

- the value is longer than 2048 characters — absurd input is refused rather than
  parsed;
- the version prefix is missing or is not `1`;
- the base64 is malformed, or the decoded JSON is;
- the decoded structure is not a two-element array whose second element is an
  array.

Pass no `fieldsMap` and field and operator validation is skipped entirely — the
structural checks still apply. That is occasionally right on a server that will
validate against a real schema regardless, but on a client it means a renamed
column reaches your data layer.

## Dropped fields

`readGridParams` surfaces `dropped` as `droppedFilterFields`, and **the grid
says so**:

> ⚠︎ 1 filter from this link no longer exists

Both builds render that as a chip beside the active filter chips, carrying
`role="status"` so a screen reader is told about it rather than only sighted
users seeing it.

This is a small piece of UI defending against a specific bad day. Somebody sends
"here are the overdue Manchester invoices" as a link. The `office` field was
renamed in a deploy last week. Without the warning the recipient sees every
invoice, believes they are looking at Manchester's, and acts on it. Nobody in
that story ever learns something went wrong. A chip costs six lines and closes
the whole hole.

The names are also available to you directly, so you can log them — a spike in
dropped field names is a good signal that a rename shipped without a migration
for saved links.

## Describing a condition

`describeCondition(condition, field)` produces the chip text:

```js
describeCondition(
  { field: "genre", operator: "in", values: ["fiction", "history"] },
  {
    id: "genre",
    label: "Genre",
    options: [
      { value: "fiction", label: "Fiction" },
      { value: "history", label: "History" },
    ],
  },
);
// "Genre is any of Fiction, History"
```

It resolves the field's `label` and each value's option `label`, so a chip reads
in the user's vocabulary rather than in database identifiers. Pass no field and
it falls back to the raw ids, which is what happens for a field the grid no
longer declares.

More than two values collapse:

```js
// values: ["a", "b", "c", "d"]  ->  "G is any of a, b +2"
```

Valueless operators drop the value section entirely: `"Note is not set"`.

## What the shipped filter UI produces

::: warning The built-in menu covers one case
Both builds render a filter menu per declared field, and that menu is a
**multi-select checkbox list that writes `operator: "in"`**. It reads `options`
and nothing else. `type` is used for validating what arrives from a URL; it does
not currently change the menu.
:::

So out of the box you get enum-style faceted filtering, which is what most
listing screens need. The model, the encoding, the validation and the chips
handle the full operator set, so:

- a `contains` or `gte` condition arriving from a shared link is decoded,
  validated, described in a chip, and passed to your `load` function correctly;
- a condition your own code puts into the query behaves the same way;
- what is missing is a date picker and a numeric comparison control in the
  toolbar.

Building those is a rendering job against a model that already supports them.
It is worth knowing which half you are getting before you plan around it.

## Filtering on the server

Your `load` function receives `query.searchParams`, but it also receives the
decoded `query` object, so the conditions are already parsed and validated:

```js
async load(query, signal) {
  const where = query.filter.conditions.map(toPrismaClause);
  // …
}

function toPrismaClause({ field, operator, values }) {
  switch (operator) {
    case "in":       return { [field]: { in: values } };
    case "not_in":   return { [field]: { notIn: values } };
    case "contains": return { [field]: { contains: values[0], mode: "insensitive" } };
    case "gte":      return { [field]: { gte: Number(values[0]) } };
    case "is_set":   return { [field]: { not: null } };
    // …
  }
}
```

Two things that mapping can rely on, because the decoder guarantees them: the
field is one you declared, and the operator is legal for its type. It does not
have to defend against `evil_field`. It **does** still have to be a
parameterised query — the values are arbitrary user strings, and validation of
the _shape_ is not sanitisation of the _content_.

Coerce types here, at this one boundary, rather than putting numbers into the
model. `Number(values[0])` in one switch statement is easier to audit than a
model whose values are sometimes numbers.
