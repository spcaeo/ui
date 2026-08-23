# React API

`react/folder-tabs.tsx` — five components, two custom props, one dependency.

```tsx
import {
  FolderTabs,
  FolderTabsRail,
  FolderTab,
  FolderTabsPanel,
  FolderTabCount,
} from "./components/folder-tabs";
```

The file starts with `"use client"`. It uses state, refs, and a
`ResizeObserver`, so it has to.

## Dependencies

| Package                | Why                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `@radix-ui/react-tabs` | Roving focus, arrow keys, Home/End, `aria-controls`/`aria-labelledby` pairing, disabled-tab skipping |

That is the complete list. There is **no** icon library — the two chevrons are
inline SVG — **no** Tailwind, and **no** `cn` helper. The file defines a
four-line `cx` internally:

```ts
const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");
```

You still need to import `folder-tabs.css` once, at the root of your app.

## Components at a glance

| Component         | Renders                                                    | Radix primitive    |
| ----------------- | ---------------------------------------------------------- | ------------------ |
| `FolderTabs`      | `.fldr-nested` when `nested`, else nothing extra           | `Tabs.Root`        |
| `FolderTabsRail`  | `.fldr-rail`, containing `.fldr-scroll` and `.fldr-arrows` | `Tabs.List`        |
| `FolderTab`       | `.fldr-tab`                                                | `Tabs.Trigger`     |
| `FolderTabsPanel` | `.fldr-panel` (+ `.fldr-panel-flush`)                      | `Tabs.Content`     |
| `FolderTabCount`  | `.fldr-count`                                              | — (a plain `span`) |

Each also carries a `data-slot` attribute — `folder-tabs`, `folder-tabs-rail`,
`folder-tab`, `folder-tabs-panel` — for styling or test selectors that should not
depend on the class names.

## `FolderTabs`

The root. Owns the selected value.

```ts
export type FolderTabsProps = React.ComponentProps<typeof TabsPrimitive.Root> & {
  nested?: boolean;
};
```

| Prop             | Type                         | Default        | Description                                                                                                                                        |
| ---------------- | ---------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nested`         | `boolean`                    | `false`        | Renders the whole control one size down, for a tab control inside a tab panel. Adds `.fldr-nested`. **Same fills** — see [Nesting](/guide/nesting) |
| `value`          | `string`                     | —              | Controlled selected value                                                                                                                          |
| `defaultValue`   | `string`                     | —              | Uncontrolled initial value                                                                                                                         |
| `onValueChange`  | `(value: string) => void`    | —              | Fires on selection change                                                                                                                          |
| `orientation`    | `"horizontal" \| "vertical"` | `"horizontal"` | Which arrow keys navigate. The stylesheet only supports horizontal                                                                                 |
| `dir`            | `"ltr" \| "rtl"`             | `"ltr"`        | Reading direction, which flips left/right arrow behaviour                                                                                          |
| `activationMode` | `"automatic" \| "manual"`    | `"automatic"`  | `"automatic"` selects on focus; `"manual"` waits for Enter or Space                                                                                |
| `className`      | `string`                     | —              | Merged after `fldr-nested`                                                                                                                         |
| `asChild`        | `boolean`                    | `false`        | Radix escape hatch — render your own element                                                                                                       |

Everything not listed is forwarded to `Tabs.Root`.

::: tip
Use `activationMode="manual"` when a panel is expensive to render. Arrow keys
then move focus without mounting each panel you pass over.
:::

## `FolderTabsRail`

The rail. Renders the scroll strip, measures overflow, and owns the two arrow
buttons.

```ts
export type FolderTabsRailProps = React.ComponentProps<typeof TabsPrimitive.List>;
```

| Prop         | Type        | Default | Description                                                                       |
| ------------ | ----------- | ------- | --------------------------------------------------------------------------------- |
| `aria-label` | `string`    | —       | **Effectively required.** Names the tab list for screen readers                   |
| `children`   | `ReactNode` | —       | Your `FolderTab` elements. Placed inside `.fldr-scroll`, not directly on the rail |
| `className`  | `string`    | —       | Merged after `fldr-rail`                                                          |
| `loop`       | `boolean`   | `true`  | Whether arrow keys wrap from last to first                                        |

No props control the arrows. They appear when the strip actually overflows and
disable at each end — see [Overflow](/guide/overflow) for why that is not
configurable.

Internally the rail keeps three pieces of state (`overflowing`, `atStart`,
`atEnd`), recomputed on scroll, on window resize, and via a `ResizeObserver`
watching both the strip and every tab in it, throttled to one measurement per
animation frame.

## `FolderTab`

One tab.

```ts
export type FolderTabProps = React.ComponentProps<typeof TabsPrimitive.Trigger>;
```

| Prop        | Type                | Default | Description                                             |
| ----------- | ------------------- | ------- | ------------------------------------------------------- |
| `value`     | `string`            | —       | **Required.** Matches the panel's `value`               |
| `disabled`  | `boolean`           | `false` | Skipped by arrow keys, `opacity: 0.45`, not activatable |
| `children`  | `ReactNode`         | —       | The label, optionally with a `FolderTabCount`           |
| `className` | `string`            | —       | Merged after `fldr-tab`                                 |
| `onFocus`   | `FocusEventHandler` | —       | Called **after** the tab is revealed in the strip       |
| `asChild`   | `boolean`           | `false` | Radix escape hatch                                      |

`FolderTab` wraps `onFocus` to bring the tab into view when it is focused —
by adjusting the strip's own `scrollLeft` rather than calling `scrollIntoView`,
which would scroll every scrollable ancestor including the page. Your `onFocus`
still runs, after.

`aria-selected`, `aria-controls`, `id`, `role`, and the roving `tabindex` are all
supplied by Radix. You do not set them.

## `FolderTabsPanel`

The panel. Shares the active tab's fill — that identity is the whole mechanic.

```ts
export type FolderTabsPanelProps = React.ComponentProps<typeof TabsPrimitive.Content> & {
  flush?: boolean;
};
```

| Prop         | Type      | Default | Description                                                                                                        |
| ------------ | --------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| `value`      | `string`  | —       | **Required.** Matches a tab's `value`                                                                              |
| `flush`      | `boolean` | `false` | Tightens padding to `14px 14px 4px`, for content that brings its own card. **Keeps the ground and the side walls** |
| `forceMount` | `boolean` | `false` | Keep the panel mounted while hidden — useful for animations or preserving scroll position                          |
| `className`  | `string`  | —       | Merged after `fldr-panel` and `fldr-panel-flush`                                                                   |
| `asChild`    | `boolean` | `false` | Radix escape hatch                                                                                                 |

`tabIndex={0}` is set for you. Radix moves focus here when the panel has no
focusable content of its own, which is the ARIA tab pattern — do not override it.

::: warning
`flush` reduces padding. It does **not** remove the background or the border, and
you should not remove them either: the active tab needs a panel to be continuous
with. See [the panel must exist](/guide/the-mechanic#the-panel-must-exist).
:::

## `FolderTabCount`

A quiet number beside a label.

```ts
function FolderTabCount(props: React.ComponentProps<"span">): JSX.Element;
```

| Prop        | Type        | Description               |
| ----------- | ----------- | ------------------------- |
| `children`  | `ReactNode` | The count                 |
| `className` | `string`    | Merged after `fldr-count` |

Everything else is spread onto the `span`.

```tsx
<FolderTab value="rules">
  Rules <FolderTabCount>3</FolderTabCount>
</FolderTab>
```

It tints itself from `currentColor` with `color-mix()`, so it works on both an
inactive tab and the active one without a second variable. Numerals are tabular,
so a count changing from `9` to `10` does not shift the label.

## A complete example

```tsx
"use client";

import { useState } from "react";
import {
  FolderTabs,
  FolderTabsRail,
  FolderTab,
  FolderTabsPanel,
  FolderTabCount,
} from "./components/folder-tabs";

export function RuleEditor({ rules, dates }) {
  const [tab, setTab] = useState("rules");
  const [detail, setDetail] = useState("hard");

  return (
    <FolderTabs value={tab} onValueChange={setTab}>
      <FolderTabsRail aria-label="Sections">
        <FolderTab value="rules">
          Rules <FolderTabCount>{rules.length}</FolderTabCount>
        </FolderTab>
        <FolderTab value="dates">Dates</FolderTab>
        <FolderTab value="preview" disabled>
          Preview
        </FolderTab>
      </FolderTabsRail>

      <FolderTabsPanel value="rules">
        <FolderTabs nested value={detail} onValueChange={setDetail}>
          <FolderTabsRail aria-label="Rule types">
            <FolderTab value="hard">Hard</FolderTab>
            <FolderTab value="soft">Soft</FolderTab>
          </FolderTabsRail>

          <FolderTabsPanel value="hard">Hard rules.</FolderTabsPanel>
          <FolderTabsPanel value="soft">Soft rules.</FolderTabsPanel>
        </FolderTabs>
      </FolderTabsPanel>

      <FolderTabsPanel value="dates" flush>
        <DateGrid rows={dates} />
      </FolderTabsPanel>

      <FolderTabsPanel value="preview">Not reachable while disabled.</FolderTabsPanel>
    </FolderTabs>
  );
}
```

Two details in there worth copying: the nested control gets its **own**
`aria-label`, because two unlabelled tab lists are indistinguishable to a screen
reader; and the grid panel is `flush`, because a grid brings its own padding and
would otherwise be boxed twice.
