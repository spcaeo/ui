---
layout: home

hero:
  name: spcaeo/ui
  text: Components built to a measured bar.
  tagline: A small collection of interface components where every colour is measured from the stylesheet by a script, every accessibility claim has a test, and CI fails if the docs and the code disagree. No build step, no design system to buy into.
  actions:
    - theme: brand
      text: Browse Components
      link: /components/
    - theme: alt
      text: The House Rules
      link: /guide/house-rules
    - theme: alt
      text: View on GitHub
      link: https://github.com/spcaeo/ui

features:
  - title: Contrast is measured, not eyeballed
    details: A script parses the stylesheet, computes every text and boundary pair in both themes, and writes the table into the docs. CI re-runs it on every push. A colour cannot be nudged without the numbers moving with it.
    link: /guide/house-rules#contrast-is-measured
    linkText: How it is enforced
  - title: State survives greyscale
    details: Shape and fill identity carry the state, never hue on its own. Print the page in black and white, or look at it with a colour vision deficiency, and it still reads. That is a requirement here, not a nice-to-have.
    link: /guide/house-rules#state-survives-greyscale
    linkText: The greyscale rule
  - title: The keyboard is not optional
    details: Roving tabindex, arrow keys, Home and End, correct roles and id pairing, a visible focus ring, and focus never parked somewhere you cannot see. Every component ships the whole WAI-ARIA pattern it claims.
    link: /guide/house-rules#keyboard-and-aria
    linkText: The full contract
  - title: No build step
    details: Plain CSS and, at most, one file per framework build. No Tailwind, no icon library, no bundler config. A framework build may take one dependency, and the README has to declare it.
    link: /guide/house-rules#no-build-step
    linkText: What that costs you
  - title: Demos run from file://
    details: Open the demo page straight off disk and it works. A demo that needs a web server to start gets filed as a bug, because a component you cannot try in ten seconds is a component nobody tries.
    link: /guide/house-rules#demos-run-from-file
    linkText: Why it matters
  - title: Every claim has a test
    details: Reduced motion, forced colours, print, keyboard traversal, overflow behaviour. If a page says the component does something, a browser test asserts it, and the test runs in CI.
    link: /guide/house-rules#every-claim-has-a-test
    linkText: The test bar
---

## What is here today

One component, finished. The collection is deliberately small — a component gets
added when it can pass every rule on the [House Rules](/guide/house-rules) page,
not when it looks ready.

<div class="shot">

[![A folder tab strip: "Rules" selected and merged into the white panel below it, with "Dates", a disabled "Preview", and "Jurisdiction" sitting on a dark rail](/screenshots/folder-tabs/hero.png)](/components/folder-tabs/)

</div>

### [Folder Tabs](/components/folder-tabs/)

A tab control where the active tab _is_ the panel — not a highlighted button.
Rebuilt from the Visual Basic 4 SSTab control: three fills in a fixed
relationship, real trapezoid tabs, a React build and a vanilla build over one
stylesheet. [Guide](/components/folder-tabs/) ·
[CSS API](/components/folder-tabs/api-css) ·
[React API](/components/folder-tabs/api-react) ·
[Vanilla API](/components/folder-tabs/api-vanilla)

Start at the [component index](/components/), or read
[the house rules](/guide/house-rules) if you want to know what the bar actually
is before you trust anything on this site.
