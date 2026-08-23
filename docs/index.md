---
layout: home

hero:
  name: VB Folder Tabs
  text: The active tab is the panel.
  tagline: Not a highlighted button. A tab control rebuilt from the Visual Basic 4 SSTab control — three fills in a fixed relationship, so the selected tab and its panel read as one sheet of paper.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: Quick Start
      link: /guide/quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/spcaeo/vb-inspired-folder-tabs

features:
  - title: The mechanic
    details: The rail is darkest. An inactive tab sits above it. The active tab is exactly the panel's fill. That identity — not a tint, not an underline — is what says which tab is selected.
    link: /guide/the-mechanic
    linkText: How it works
  - title: VB4 heritage
    details: Trapezoid tabs cut with an angled right edge, standing on a darker rail. Directly inspired by the SSTab control and the Windows 3.1/95 era tab controls, because they solved this problem and then everyone forgot.
    link: /guide/
    linkText: The background
  - title: Survives greyscale
    details: Shape and shared fill carry the state, so it still reads on a black-and-white print, for a colourblind user, or on a badly calibrated monitor. A tint alone does none of that.
    link: /guide/the-mechanic#the-greyscale-test
    linkText: The greyscale test
  - title: Measured contrast
    details: Every pair computed from the stylesheet's own values, not eyeballed — including the arithmetic proof that no two dark fills can carry a 3:1 boundary, which is why the edge stroke exists. The numbers are a set — change one, re-measure all.
    link: /guide/theming#contrast
    linkText: The contrast table
  - title: React and vanilla
    details: A React build on Radix Tabs, where the keyboard and ARIA work comes free, and a zero-dependency ES module for pages that have no framework. One stylesheet between them.
    link: /guide/installation
    linkText: Install it
  - title: No build step
    details: Plain CSS, one React file, one JS file. No Tailwind, no icon library, no cn helper, no bundler config. The React build's only dependency is @radix-ui/react-tabs; the vanilla build has none at all.
    link: /api/css
    linkText: API reference
---

## In one paragraph

Most tab strips mark the selected tab by tinting it, or by putting a coloured bar
under it. That works until the page is printed in black and white, or the user
cannot separate those two hues, or the monitor is cheap. This control does
something older and sturdier: it gives the selected tab **the panel's own fill**,
and cuts it as a trapezoid that stands proud of the rail, so the tab and the
panel become one continuous shape. You are not reading a highlight. You are
reading a join.

<div class="shot">

![A folder tab strip: "Rules" selected and merged into the white panel below it, with "Dates", a disabled "Preview", and "Jurisdiction" sitting on a dark rail](/screenshots/hero.png)

</div>

<p class="shot-caption">"Rules" is not highlighted. It is the panel, continuing upward past the rail.</p>

Read [the mechanic](/guide/the-mechanic) first. Everything else in these docs is
detail hanging off it.
