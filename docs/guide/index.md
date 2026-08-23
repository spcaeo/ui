# What this collection is

`spcaeo/ui` is a small set of interface components that are copied into your
project rather than installed from a registry. There is no npm package, no theme
provider, no design tokens you have to adopt. You take a stylesheet and, if you
want state handled for you, one small file per framework.

That sounds like a limitation. It is the point. A component small enough to
vendor is a component you can read, measure, and change — and everything below is
only possible because the surface is that small.

## The bar

Every component in this collection meets the same set of rules, in full, before
it is listed. They are written out on [House Rules](/guide/house-rules), and in
short they are:

1. **Contrast is measured by a script, not by eye,** and CI fails if the
   stylesheet and the published numbers disagree. Text clears 4.5:1, boundaries
   clear 3:1 — by fill or by a measured stroke.
2. **State survives greyscale.** Shape and fill identity carry the state; hue
   alone never does.
3. **The whole keyboard and ARIA pattern ships,** not the parts that were
   convenient.
4. **`prefers-reduced-motion`, `forced-colors` and print are handled.**
5. **No build step,** and at most one dependency for a framework build, declared
   in the README.
6. **Every behavioural claim has a browser test.**
7. **The demo opens from `file://`.**

None of these are aspirations. Each one is either enforced by a script in CI or
asserted by a test, which is the only reason it is worth telling you about them.

## Why a script measures the colours

The interesting rule is the first one, because it is the one everybody thinks
they are already doing.

Colour variables in a component are **a measured set, not a palette you
taste-test**. Change one fill and you change the ratios of every pair it takes
part in, in both themes. Doing that by eye works right up until a boundary lands
at 2.9:1 and nobody notices, because 2.9 and 3.1 look identical.

So a script parses the stylesheet, computes every pair, and writes the table into
the documentation between generated markers. CI re-runs it with `--check` on
every push. If someone nudges a colour and does not re-measure, the build goes
red before review.

The folder-tabs
[contrast table](/components/folder-tabs/theming#contrast) is what that produces.
The margins in it are genuinely thin — one boundary sits at 3.02 against a
requirement of 3.0 — which is exactly why it is generated and not typed.

## Where to go

- [Components](/components/) — the index of what exists, with screenshots
- [House Rules](/guide/house-rules) — the full bar, rule by rule
- [Contributing](/guide/contributing) — how to meet it in a pull request

If you only read one component page, read
[The Mechanic](/components/folder-tabs/the-mechanic). It is folder-tabs-specific,
but it is the clearest example of the thing this collection cares about: an idea
that carries the interface, rather than a decoration applied on top of one.
