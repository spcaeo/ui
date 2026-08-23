# Theming

The control is themed entirely through CSS custom properties. There are no other
colours in the stylesheet — no hard-coded hex in a rule, no inherited surface
tokens from a design system. Override the variables and you have rethemed
everything.

That is the good news. The bad news is on the rest of this page: the values are
**a measured set with a required ordering**, not a palette you can taste-test.

## The variables

```css
:root {
  --tab-rail: oklch(0.2 0.02 260); /* the band the tabs stand on */
  --tab-rail-fill: oklch(0.5 0.03 260); /* an inactive tab */
  --tab-rail-ink: oklch(0.96 0 0); /* its label */
  --tab-panel: oklch(1 0 0); /* the panel AND the active tab */
  --tab-panel-ink: oklch(0.145 0 0);
  --tab-edge: oklch(0.2 0.02 260); /* the stroke that carries every boundary */
  --tab-ring: oklch(0.98 0 0); /* focus, on an inactive tab */
  --tab-ring-on-panel: oklch(0.3 0 0); /* focus, on the active tab or panel */
}
```

| Variable              | What it paints                                     | Constraint                                  |
| --------------------- | -------------------------------------------------- | ------------------------------------------- |
| `--tab-rail`          | The rail behind the tabs                           | Must be the **darkest** of the three fills  |
| `--tab-rail-fill`     | An inactive tab, and the overflow arrows           | Between the rail and the panel in lightness |
| `--tab-rail-ink`      | An inactive tab's label, and the arrow glyphs      | ≥ 4.5:1 against `--tab-rail-fill`           |
| `--tab-panel`         | The panel **and** the active tab                   | Must be the **lightest** of the three fills |
| `--tab-panel-ink`     | Panel text and the active tab's label              | ≥ 4.5:1 against `--tab-panel`               |
| `--tab-edge`          | The stroke around every tab, and the panel border  | ≥ 3:1 against every surface it touches      |
| `--tab-ring`          | Focus outline on an inactive tab and on the arrows | ≥ 3:1 against `--tab-rail-fill`             |
| `--tab-ring-on-panel` | Focus outline on the active tab and the panel      | ≥ 3:1 against `--tab-panel`                 |

The ordering in the "Constraint" column is not a style preference. It is the
[mechanic](/guide/the-mechanic): rail darkest, inactive tab above it, active tab
and panel lightest and identical. Break the ordering and you have built a
different control that happens to use these class names.

### Why the focus ring is two variables

A focus ring has to be visible against whatever is behind it, and in this control
there are two very different behinds: an inactive tab (`--tab-rail-fill`, darkish)
and the active tab or panel (`--tab-panel`, lightest). One ring colour cannot
clear 3:1 against both in light theme — a near-white ring that reads beautifully
on a dark inactive tab is invisible on a white active tab.

So `.fldr-tab:focus-visible` uses `--tab-ring`, and
`.fldr-tab[data-state="active"]:focus-visible` and `.fldr-panel:focus-visible`
switch to `--tab-ring-on-panel`. In dark theme the two happen to be set to the
same value, because there the panel is dark enough that one light ring serves
both. That they _can_ be equal is a property of a particular theme, not a licence
to collapse them into one variable.

### Why the edge is its own variable

`--tab-edge` is the newest and least obvious of the eight, and it exists because
of an arithmetic fact about WCAG. See [Contrast](#contrast) below — the short
version is that in dark mode the difference between two fills **cannot** carry
the boundary, so a stroke has to. Exactly as the original Windows control used a
3D border.

In light theme `--tab-edge` is set to the same value as `--tab-rail`, so the
stroke disappears into the rail and the fill difference does the work. In dark
theme it lifts to `oklch(0.70 0 0)` — a light grey outline, clearly visible
against all three fills. Same control, two different mechanisms for the same
requirement, chosen per theme.

One implementation detail worth knowing if you restyle the tab: **a `border`
cannot be used here.** `clip-path` cuts the border off along the diagonal edge.
The stroke is drawn as three zero-blur `drop-shadow()` filters instead, which do
trace the clipped silhouette:

```css
filter: drop-shadow(1px 0 0 var(--tab-edge)) drop-shadow(-1px 0 0 var(--tab-edge))
  drop-shadow(0 -1px 0 var(--tab-edge));
```

There is no fourth shadow along the bottom. That absence **is** the join: the
active tab has no line between it and the panel, because they are one sheet.

## Retheming

Redefine the variables wherever you like — on `:root`, on a wrapper element, or
on the control itself. They cascade normally, so a scoped override is a good way
to give one section of an app its own colourway.

```css
/* A warmer theme, applied to the whole document */
:root {
  --tab-rail: oklch(0.24 0.03 60);
  --tab-rail-fill: oklch(0.52 0.05 60);
  --tab-rail-ink: oklch(0.97 0 0);
  --tab-panel: oklch(0.99 0.01 80);
  --tab-panel-ink: oklch(0.18 0.02 60);
  --tab-edge: oklch(0.24 0.03 60);
  --tab-ring: oklch(0.98 0 0);
  --tab-ring-on-panel: oklch(0.3 0 0);
}
```

Scoped to one region:

```css
.reports-section {
  --tab-rail: oklch(0.22 0.04 250);
  --tab-rail-fill: oklch(0.48 0.06 250);
  --tab-edge: oklch(0.22 0.04 250);
  /* the rest inherit from :root */
}
```

::: warning
A partial override is the most common way to break the mechanic by accident. If
you change `--tab-rail-fill` without checking it against `--tab-panel` and
`--tab-rail`, you can easily land on a value lighter than the panel — at which
point the _inactive_ tabs are the brightest thing in the control and the selected
one looks switched off.
:::

### Hue-only rotations are the safe edit

Because the shipped values are OKLCH, the first number is perceptual lightness
and the third is hue. Rotating the hue while leaving lightness alone gives you a
new colourway that preserves the ordering, the mechanic, and — very nearly — the
contrast. It is still an edit that requires re-measuring, but it is the edit
least likely to break something.

Changing the _lightness_ numbers is the dangerous edit, because that is the axis
the whole control is built on.

### If you do not use OKLCH

You are not required to. `hsl()`, hex, and `rgb()` all work. The stylesheet
already ships sRGB equivalents for browsers without OKLCH support:

```css
@supports not (color: oklch(0 0 0)) {
  :root {
    --tab-rail: #11161f;
    --tab-rail-fill: #596475;
    --tab-rail-ink: #f2f2f2;
    --tab-panel: #ffffff;
    --tab-panel-ink: #0a0a0a;
    --tab-edge: #11161f;
    --tab-ring: #fafafa;
    --tab-ring-on-panel: #3d3d3d;
  }
  /* …and the dark set */
}
```

Those hex values are generated, not hand-written, and the header comment in the
stylesheet says so. If you retheme, either regenerate them or delete the block —
do not leave it holding the old colours, because a browser without OKLCH will
then render your control in someone else's palette.

## Dark mode

The dark values are applied three ways, so they work with whichever dark-mode
strategy your app already has:

```css
.dark,
[data-theme="dark"] {
  --tab-rail: oklch(0.17 0.02 260);
  --tab-rail-fill: oklch(0.26 0.02 260);
  --tab-rail-ink: oklch(0.93 0 0);
  --tab-panel: oklch(0.4 0 0);
  --tab-panel-ink: oklch(0.985 0 0);
  --tab-edge: oklch(0.7 0 0);
  --tab-ring: oklch(0.95 0 0);
  --tab-ring-on-panel: oklch(0.95 0 0);
}

/* Follow the OS when nothing has made an explicit choice. */
@media (prefers-color-scheme: dark) {
  :root:not(.light):not([data-theme="light"]) {
    /* the same eight values */
  }
}
```

Note the `:not()` guards on the media query. They matter: a user who has
explicitly chosen light mode in your app, on a machine whose OS is set to dark,
must get light mode. Without the guards the OS preference would override the
explicit choice, which is the wrong way round — an explicit choice always beats
an inferred one.

Now look at the dark lightness values next to the light ones and notice what did
**not** change: the _ordering_. `0.17` rail, `0.26` inactive tab, `0.40` panel.
The panel is still the lightest. Everything got darker; nothing got reordered.

## The dark-mode trap

This is the single easiest thing to get wrong, and it deserves its own section
because the failure is invisible in the code and obvious only on screen.

> **The active tab must stay the LIGHTEST of the three, because it _is_ the
> panel.** If your dark-mode panel token is darker than your tab fill, the
> selected tab reads as _pressed in_ and the unselected ones read as raised.
> Exactly backwards.

Here is how it happens. In dark mode you already have a `--card` or `--surface`
token — some near-black like `oklch(0.21 0 0)` — and it is obviously "the colour
of a panel", so you point `--tab-panel` at it. Meanwhile `--tab-rail-fill` has to
be light enough to carry a legible label, so it drifts up to around
`oklch(0.26 0 0)`.

Now the inactive tabs are lighter than the selected one, and everything inverts:

|               | What you intended                  | What the user sees                |
| ------------- | ---------------------------------- | --------------------------------- |
| Active tab    | Nearest, continuous with the panel | Recessed, pushed in, switched off |
| Inactive tabs | Behind, on the rail                | Raised, forward, available        |

The join is gone too, because a dark tab merging into a dark panel merges
visually into the _rail_ instead. The control now reads as "three raised buttons
and one hole".

This is exactly why `--tab-panel` is its own variable rather than an alias for a
card colour. Dark mode has far less usable range below "a panel you can
comfortably read text on" than light mode has above it. In light theme you can
run from `1.0` down to `0.20` with room to spare. In dark theme the panel cannot
realistically go below about `0.35` without the body text becoming unpleasant,
which squeezes the rail and the inactive tab into the narrow space beneath it.
That squeeze is why the shipped dark fills are `0.17` and `0.26` — close
together, correctly ordered, and measured.

**Do not point `--tab-panel` at a generic surface token.** Give it its own value,
chosen so it stays the lightest of the three.

## Contrast

Measured from the exact values in the stylesheet, not eyeballed. WCAG 2.x asks
4.5:1 for normal text (1.4.3) and 3:1 for the boundary of a user-interface
component (1.4.11).

| What is being measured              | Light | Dark  | Needs |
| ----------------------------------- | ----- | ----- | ----- |
| Label on an inactive tab            | 5.35  | 12.72 | ≥ 4.5 |
| Label on the active tab             | 19.80 | 8.63  | ≥ 4.5 |
| Inactive tab against the rail       | 3.03  | 1.22  | ≥ 3.0 |
| Active tab / panel against the rail | 18.13 | 2.12  | ≥ 3.0 |
| Edge stroke against the rail        | 1.00  | 7.12  | ≥ 3.0 |
| Edge stroke against an inactive tab | 3.03  | 5.82  | ≥ 3.0 |
| Edge stroke against the panel       | 18.13 | 3.36  | ≥ 3.0 |
| Focus ring against an inactive tab  | 5.74  | 13.68 | ≥ 3.0 |
| Focus ring against the panel        | 10.86 | 7.90  | ≥ 3.0 |

Read the two boundary rows in the dark column and you will see them fail: 1.22
and 2.12, against a requirement of 3.0. That is not an oversight. It is the
reason `--tab-edge` exists.

### Why dark fills cannot carry a boundary

WCAG 2.x contrast is `(L1 + 0.05) / (L2 + 0.05)`, where `L` is relative
luminance. That flat `0.05` is a flare term, meant to model light scattering in
the eye and on the screen — and down near black it dominates the arithmetic.

Work it through. A panel at `#494949` has a relative luminance of about 0.072.
Against a **pure black** rail, the best possible ratio is
`(0.072 + 0.05) / (0 + 0.05)` = **1.66**. There is no rail dark enough to reach
3:1. The requirement is unreachable for any pair of genuinely dark fills, no
matter how you choose them.

So the boundary has to be carried by something that is _not_ a dark fill: a
stroke. `--tab-edge` at `oklch(0.70 0 0)` clears 3:1 against the rail (7.12), the
inactive tab (5.82), and the panel (3.36) simultaneously. Every tab boundary and
the panel border are drawn with it. This is precisely what the original Windows
tab control did with its 3D border, for the same reason, on hardware that had
even less to work with.

In light theme the arithmetic is generous, so `--tab-edge` is set equal to
`--tab-rail`, disappears, and lets the fill difference carry the boundary at
3.03. One control, two mechanisms, each used where it works.

### The numbers are a set

This is the rule that makes theming this control different from theming a button:

> Lift the tab fill for a clearer edge and the label drops under 4.5. Darken it
> for the label and the edge disappears. **Change one, re-measure all.**

`--tab-rail-fill` sits in three contrast relationships at once. It is the
background for `--tab-rail-ink` (needs ≥ 4.5), the foreground against
`--tab-rail` in light theme (needs ≥ 3.0), and the background for both
`--tab-edge` and `--tab-ring` (each needs ≥ 3.0). Those requirements pull in
opposite directions, and the shipped values are where all of them are satisfied
with the least slack. Look at light theme's 3.03 against a 3.0 requirement:
there is no room at all. "Just nudge it a bit lighter" is never a safe edit here.

### How to re-measure

The stylesheet header points at a script for this:

```bash
npm run contrast
```

It re-measures every pair from the values in `folder-tabs.css` and tells you what
you broke. Run it after any colour change, in both themes.

If you are checking by hand instead:

1. Render the control at final size, in the theme you changed — **rendered
   pixels**, not a swatch in a design tool. `opacity` on disabled tabs,
   `color-mix()` on hover, and antialiasing along the clipped diagonal all change
   what is actually on screen.
2. Screenshot it and sample colours with an eyedropper.
3. Put every pair in the table above through a WCAG contrast checker.
4. Repeat for the **other** theme. A change to a shared value affects both.
5. Record the numbers. If you are contributing upstream, the contrast table in
   `README.md` must be updated in the same pull request, and the PR must say
   which values you measured and with what tool. See
   [Contributing](/guide/contributing).

### Disabled tabs

`.fldr-tab:disabled` is `opacity: 0.45`, which puts its label below 4.5:1
deliberately. WCAG exempts disabled controls from the contrast requirement, and
the reduced contrast is itself the signal that the tab is unavailable. Do not
"fix" it by raising the opacity — you would be removing the only cue a user has
that the tab is disabled, short of clicking it and getting nothing.

In forced-colors mode the stylesheet drops the opacity trick entirely and uses
the system `GrayText` keyword instead, which is the correct signal there.
