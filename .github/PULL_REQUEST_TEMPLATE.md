## What does this change?

<!-- One or two sentences. Link the issue it closes, if there is one. -->

Closes #

## Checklist

- [ ] Tested in **light** theme and **dark** theme
- [ ] Tested **keyboard navigation** — Left/Right arrows, Home, End, and Tab in and out of the strip
- [ ] Tested **overflow** by narrowing the window until the scroll arrows appear
- [ ] Ran `npx prettier --check .` and it passes
- [ ] I did **not** change any of the six colour variables in `folder-tabs.css`

### If you did change a colour variable

- [ ] I re-measured **every** affected contrast ratio in **both** themes
- [ ] Label text is at least **4.5:1** against its tab
- [ ] The tab/rail boundary is at least **3.0:1**
- [ ] I updated the contrast table in `README.md` with the new numbers

Measured with: <!-- which tool, e.g. WebAIM Contrast Checker -->

## Notes for the reviewer

<!-- Anything worth knowing: trade-offs, things you were unsure about, screenshots. -->
