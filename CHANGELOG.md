# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-08-23

### Added

- **The CSS control** (`folder-tabs.css`) — the folder-tab look on its own, with no
  JavaScript required. Inspired by the Visual Basic 4 SSTab control: overlapping
  notched tabs, a raised active tab, and a continuous rail joining the tab strip to
  the panel below it.
- **React build** (`react/folder-tabs.tsx`) — a typed component layered on Radix UI
  primitives, so state, focus management, and accessibility come from a well-tested base.
- **Vanilla JS build** (`vanilla/folder-tabs.js`) — the same control with zero
  dependencies and no build step. Drop in the script and the stylesheet.
- **Demo page** (`demo.html`) — a single self-contained file showing every variant.
  Open it straight from disk; nothing to install.
- **Documentation site** (`docs/`) — a VitePress site covering install, the API of
  each build, theming, and the accessibility notes.
- **WCAG-measured light and dark themes** — six colour variables per theme, each fill
  measured so label text holds at least 4.5:1 against its tab and the tab/rail
  boundary holds at least 3.0:1. The measured ratios are published in the README.
- **Nested tabs** — a tab strip inside a tab panel, with the inner strip visually
  and semantically distinct from the outer one.
- **Overflow arrows** — when the strip is narrower than its tabs, scroll arrows appear
  at each end and the active tab is kept in view.
- **Full ARIA tab pattern support** — `tablist`/`tab`/`tabpanel` roles, `aria-selected`,
  `aria-controls`/`aria-labelledby` wiring, roving tabindex, and Left/Right/Home/End
  keyboard navigation, in both the React and vanilla builds.

[Unreleased]: https://github.com/spcaeo/vb-inspired-folder-tabs/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/spcaeo/vb-inspired-folder-tabs/releases/tag/v1.0.0
