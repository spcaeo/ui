# House Rules

This is the bar. Every component in this collection meets all of it, and a new
component is not listed until it does.

The rules are written so they can be checked rather than argued about. Each one
says what it requires and how it is verified — by a script in CI, by a browser
test, or by a review step that has a definite answer. If a rule cannot be
checked, it does not belong on this page.

## 1. Contrast is measured, never eyeballed {#contrast-is-measured}

**The rule.** A component's colour variables are a **measured set, not a palette
you taste-test**. Change one fill and you change every ratio it takes part in, in
both themes. So the numbers are computed from the stylesheet by a script, and the
script's output is the published table.

**The thresholds:**

| What                       | Minimum | Source                        |
| -------------------------- | ------- | ----------------------------- |
| Label text on its own fill | 4.5:1   | WCAG 1.4.3 Contrast (Minimum) |
| Any interface boundary     | 3.0:1   | WCAG 1.4.11 Non-text Contrast |

**The part people get wrong.** A boundary may be carried **either** by a fill
difference **or** by a measured stroke along the edge. Both count. This is not a
loophole — it is the only reason a dark theme can pass at all, because two
genuinely dark fills cannot reach 3:1 against each other. The arithmetic is
written out in
[why dark fills cannot carry a boundary](/components/folder-tabs/theming#why-dark-fills-cannot-carry-a-boundary).
A dark theme that claims a 3:1 boundary purely on fill is either lying or not
dark.

**How it is enforced.** `npm run contrast` parses the stylesheet, computes every
pair in both themes, and `--sync` writes the result into the docs between
`CONTRAST:START` / `CONTRAST:END` markers. CI runs `--check`. If the stylesheet
and the published table disagree, the build is red before a human looks at it.

**Two things to get right when you re-measure:**

- Measure the `oklch()` declarations, not the sRGB values in the `@supports`
  fallback block. The fallbacks are rounded and disagree in the second decimal,
  which is enough to flip a boundary sitting on 3.02.
- Never hand-edit anything between the generated markers. It is overwritten.

Worked example: [folder tabs' contrast table](/components/folder-tabs/theming#contrast).

## 2. State must survive greyscale {#state-survives-greyscale}

**The rule.** Whatever a component is saying about its state — selected,
disabled, active, expanded — must still be readable when every colour is
desaturated. **Shape and fill identity carry state. Hue never carries it alone.**

**Why.** A tint-only indicator fails on a black-and-white printout, for a user
with a colour vision deficiency, on a cheap or badly calibrated monitor, and in
bright sunlight. Those are not edge cases stacked up to sound serious; they are
four ordinary situations.

**What passes.** A difference in silhouette, a difference in size, a shared fill
that makes two elements read as one surface, a border that appears or
disappears — anything that a greyscale screenshot still shows.

**What fails.** The selected item is the same shape, same size, and same
lightness as its neighbours, distinguished only by hue.

**How it is checked.** Desaturate a screenshot of the component in each state and
look at it. If you cannot tell the states apart, it fails. Folder tabs' version
of this test is [the greyscale test](/components/folder-tabs/the-mechanic#the-greyscale-test).

## 3. The whole keyboard and ARIA pattern ships {#keyboard-and-aria}

**The rule.** If a component claims a WAI-ARIA pattern, it implements that
pattern in full. Partial is a failure, not a stage.

**The checklist:**

- **Roving `tabindex`.** Exactly one item in the group is in the tab order at a
  time; the rest are `tabindex="-1"`. Tab enters and leaves the group; it does not
  walk through it.
- **Arrow keys** move within the group, and wrap.
- **`Home` and `End`** jump to first and last.
- **Disabled items are skipped** by arrow-key traversal — but stay perceivable
  and stay announced. Removing something from the DOM is not the same as
  disabling it.
- **Correct roles**, and correct `id` pairing between a control and the region it
  controls, in both directions where the pattern requires it.
- **Visible focus.** A focus ring that clears 3:1 against every surface it can
  land on — which usually means more than one focus-ring variable, because a ring
  tuned for a light fill will vanish on a dark one.
- **Focus is never moved somewhere invisible.** If activating something scrolls,
  collapses, or replaces a region, focus must end up somewhere the user can see.
  A focused element scrolled out of view is a lost user.
- **State attributes stay in sync** with the visual state. `aria-selected`,
  `aria-expanded`, `data-state` and the fill are all reporting the same fact to
  different audiences; they cannot drift apart.

**How it is checked.** Browser tests assert the traversal and the attribute
pairing (see rule 6), plus a manual pass: unplug the mouse and use the component.
Folder tabs' implementation is documented in
[Accessibility](/components/folder-tabs/accessibility).

## 4. Reduced motion, forced colours, and print are handled {#environment-modes}

**The rule.** Three environments are not optional, and each one has a definite
requirement.

- **`prefers-reduced-motion: reduce`** — transitions and animations are removed
  or reduced to an instant state change. The component must remain fully usable
  with no motion at all; nothing may depend on an animation to communicate what
  happened.
- **`forced-colors: active`** (Windows High Contrast and equivalents) — the
  component stops relying on its own fills and uses system colour keywords. State
  that was carried by a fill must be re-expressed in something forced colours
  preserves: a border, an outline, `Highlight`/`HighlightText`. This is where
  rule 2 pays off, because a component whose state is already carried by shape
  has much less to re-express.
- **Print** — the component renders legibly on paper. Dark fills that would burn
  a cartridge are lightened, state is still distinguishable (rule 2 again), and
  nothing important is inside a region that only exists when scrolled.

**How it is checked.** Emulate each mode in the browser's rendering panel and
look. Print goes through the print preview, not through hope.

## 5. No build step {#no-build-step}

**The rule.** The component itself compiles to nothing, because it is not
compiled. Plain CSS, plus at most one small file per framework build. Open the
demo, edit the file, refresh.

**Dependencies:**

- A vanilla build has **zero** dependencies.
- A framework build may take **at most one**, and only where it buys something
  substantial — a keyboard and ARIA implementation, for instance, is worth a
  dependency; a class-name helper is not.
- The component's README must **declare every single one**. Not "minimal
  dependencies" — the actual names.

**Explicitly not allowed:** Tailwind or any utility framework, an icon library,
a `cn`/`clsx` helper, a bundler config, a preprocessor, a token pipeline. If two
chevrons are needed, they are two inline SVGs.

**Why it is worth the constraint.** The whole vendoring model — copy the files
in and own them — collapses the moment the component needs a toolchain to become
itself. And a stylesheet with no build step is a stylesheet a script
can parse, which is what makes rule 1 possible.

## 6. Every behavioural claim has a browser test {#every-claim-has-a-test}

**The rule.** If a documentation page says the component does something, a test
running in a real browser asserts that it does, and that test runs in CI.

This applies to the boring claims as much as the interesting ones: that arrow
keys wrap, that disabled items are skipped, that the overflow arrows disable at
each end, that focus is revealed rather than left off-screen, that the two state
attributes agree.

**The consequence, which is the point:** a claim you cannot test is a claim you
must delete from the docs. That constraint is doing more work than the tests
themselves — it keeps the pages describing what the code does rather than what
the author intended.

## 7. Demos run from `file://` {#demos-run-from-file}

**The rule.** Every component ships a demo page that works when you open it
straight off disk. No server, no install, no build.

```bash
open components/folder-tabs/demo.html
```

**A demo that needs a web server is a bug, and gets reported as one.** Not a
documentation gap, not a known limitation — a bug against the component.

**Why it is a hard rule.** Ten seconds is the whole budget you get from someone
deciding whether to look at your component. `npm install` spends it. It also
keeps the component honest: needing a server almost always means something has
crept in that the no-build-step rule already forbids, so this rule catches
violations of rule 5 before review does.

**What a demo must exercise:** every variant, both themes, and the awkward states
— disabled, overflowing, nested, empty. One page. The demo is not a screenshot
of the happy path; it is where you check you have not broken something else.

## What this bar is not

It is not a claim that these components are the best-looking, the most flexible,
or the right choice for your project. It is a claim about a specific, checkable
set of properties, most of which have a script or a test standing behind them.

If a component in this collection fails one of these rules, that is a bug worth
filing, and the rule is the thing to cite. See
[Contributing](/guide/contributing).
