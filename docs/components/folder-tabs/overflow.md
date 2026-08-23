# Overflow

What happens when there are more tabs than there is room for.

## The scroll strip

The rail is a flex row with two children: `.fldr-scroll`, which grows, and
`.fldr-arrows`, which does not.

```
┌─ .fldr-rail ─────────────────────────────────────────────┐
│ ┌─ .fldr-scroll (flex: 1 1 auto, overflow-x: auto) ──┐ ┌──┐ │
│ │  tab  tab  tab  tab  tab  tab  tab  tab  tab …     │ │‹›│ │
│ └────────────────────────────────────────────────────┘ └──┘ │
└──────────────────────────────────────────────────────────┘
```

<div class="shot only-light">

![Eleven tabs overflowing their rail in light theme, with two small scroll arrows at the right-hand end inside the rail](/screenshots/folder-tabs/overflow-light.png)

</div>

<div class="shot only-dark">

![Eleven tabs overflowing their rail in dark theme, with two small scroll arrows at the right-hand end inside the rail](/screenshots/folder-tabs/overflow-dark.png)

</div>

<p class="shot-caption">Eleven tabs in a rail with room for nine. The arrows sit inside the rail at its right end; the left one is disabled because the strip is already at the start.</p>

`.fldr-scroll` carries `flex: 1 1 auto` **and** `min-width: 0`. The second one is
the part people forget: without it a flex item refuses to shrink below the
intrinsic width of its content, so the strip would push the rail wider than its
container instead of scrolling inside it. Every tab has `flex: 0 0 auto` and
`white-space: nowrap`, so tabs never squash or wrap — they run off the edge and
the strip scrolls.

The scrollbar is hidden (`scrollbar-width: none` plus a `::-webkit-scrollbar`
rule) because a horizontal scrollbar under a 28px tab strip is taller than the
gap it sits in and looks like a bug. The arrows are the affordance instead.

Two smaller decisions in the same block:

```css
scroll-behavior: smooth;
overscroll-behavior-x: contain;
```

`scroll-behavior: smooth` makes an arrow click glide rather than jump, so the eye
can follow which tabs moved (and it is disabled under
`prefers-reduced-motion`). `overscroll-behavior-x: contain` stops a horizontal
trackpad flick at the end of the strip from triggering the browser's
back-navigation gesture — losing the page because you scrolled a tab strip too
enthusiastically is a genuinely bad afternoon.

## The arrows

```html
<div class="fldr-arrows">
  <button class="fldr-arrow" data-dir="-1" tabindex="-1" aria-label="Scroll tabs left">‹</button>
  <button class="fldr-arrow" data-dir="1" tabindex="-1" aria-label="Scroll tabs right">›</button>
</div>
```

They live **inside** the rail, at its right end. That is deliberate: they are part
of the control, not furniture beside it. Put them outside and you have added a
second object to the layout that has to be aligned, spaced, and explained; put
them inside and they are obviously the strip's own controls.

Each click scrolls by `Math.max(140, strip.clientWidth * 0.7)` pixels — 70% of
the visible width, with a 140px floor. Seventy per cent rather than a full page
so a tab or two stays visible across the jump and the user keeps their place;
the floor so a very narrow strip still moves by a useful amount rather than
inching.

## They disable, they do not disappear

This is the decision worth arguing about, so here is the argument.

The obvious implementation hides each arrow when you reach that end of the strip.
It looks tidier. It is worse to use, for one reason:

> A control that changes width under the cursor is a control that misfires.

Picture it. You are clicking the right arrow repeatedly to walk along a long tab
strip. On the click that reaches the end, the right arrow vanishes. The remaining
arrow — or whatever is next in the layout — slides across to fill the gap, and
lands under your cursor. Your next click, already in motion, hits something you
did not aim at. If that something is the left arrow, you have just scrolled back
to where you started.

Disabled arrows stay put. The row does not reflow, the target under your cursor
is the target you aimed at, and a disabled button that does nothing is a much
better outcome than a live button you did not mean to press. The reduced opacity
(`0.3`) tells you why nothing happened.

The same reasoning is why the whole `.fldr-arrows` block only appears when the
strip _actually_ overflows:

```css
.fldr-arrows {
  display: none;
}
.fldr-arrows[data-overflowing="true"] {
  display: flex;
}
```

That is a layout change too, but it happens on resize — when the user is already
expecting things to move — rather than mid-click.

## How overflow is detected

Both builds measure the same way:

```js
const max = strip.scrollWidth - strip.clientWidth;
overflowing = max > 1;
atStart = strip.scrollLeft <= 1;
atEnd = strip.scrollLeft >= max - 1;
```

The `1`-pixel slack on each comparison is not superstition. Sub-pixel layout,
fractional device pixel ratios, and browser rounding mean `scrollLeft` frequently
lands at something like `239.5` when `max` is `240`, and a strict comparison
would leave the right arrow enabled forever at the end of the strip, scrolling
nothing.

### Measuring at the right time

Tab strips change after mount. A count badge arrives from an API, a role check
hides a tab, a font finishes loading and every label gets 2px wider. So the
measurement cannot happen once at startup.

Both builds observe:

- a `ResizeObserver` on the strip **and** on each tab,
- the window's `resize` event,
- the strip's own `scroll` event.

And both throttle to one measurement per animation frame:

```js
const queueSync = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(sync);
};
```

`scroll` fires once per frame during a smooth scroll, and `sync` reads
`scrollWidth` and `clientWidth`, which force layout. Doing that synchronously on
every scroll event is the easiest way to make a smooth strip feel slow — you get
a layout thrash on exactly the frames where smoothness is being judged.

## Keyboard users do not need the arrows

Arrow **keys** reach every tab whether or not it is currently scrolled into view,
and the focused tab is revealed automatically by adjusting the strip's
`scrollLeft`. That is why the arrow **buttons** are `tabindex="-1"`: they
duplicate functionality that the keyboard already has, so putting them in the tab
sequence would add two dead stops for no gain.

See [focus is revealed, not scrolled-into-view](/components/folder-tabs/accessibility#focus-is-revealed-not-scrolled-into-view)
for why both builds move `scrollLeft` by hand rather than calling
`scrollIntoView()`.

## Printing

`@media print` hides the arrows and sets `.fldr-scroll` to `overflow: visible`,
so a strip that scrolls on screen lays out in full on paper. Printing a tab strip
with half its tabs clipped off the right-hand edge would be a poor showing for a
control that makes a point of surviving a black-and-white printout.

## When there are too many tabs

Overflow handling is a safety net, not a licence. A strip the user has to scroll
is a strip where some options are invisible, and invisible options do not get
used.

If you are routinely overflowing:

- Consider whether some tabs belong one level down, as a
  [nested](/components/folder-tabs/nesting) control inside a panel.
- Consider whether the labels can be shorter. Tabs are `nowrap`, so a three-word
  label costs real width.
- Consider whether the screen is doing two jobs.

Ten tabs at a comfortable width is roughly where a 1280px rail runs out. If you
are past that, the information architecture is usually the actual problem.
