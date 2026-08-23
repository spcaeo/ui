/**
 * FOLDER TABS — no framework, no dependencies.
 *
 * The same control as the React version, for a page that has no React. Give it
 * the markup below and call `initFolderTabs()`.
 *
 *   <div class="fldr" data-folder-tabs>
 *     <div class="fldr-rail" role="tablist" aria-label="Sections">
 *       <div class="fldr-scroll">
 *         <button class="fldr-tab" role="tab" data-state="active" aria-controls="p1">Rules</button>
 *         <button class="fldr-tab" role="tab" data-state="inactive" aria-controls="p2">Dates</button>
 *       </div>
 *       <div class="fldr-arrows">
 *         <button class="fldr-arrow" data-dir="-1" tabindex="-1" aria-label="Scroll tabs left">‹</button>
 *         <button class="fldr-arrow" data-dir="1"  tabindex="-1" aria-label="Scroll tabs right">›</button>
 *       </div>
 *     </div>
 *     <div class="fldr-panel" id="p1">…</div>
 *     <div class="fldr-panel" id="p2" hidden>…</div>
 *   </div>
 *
 * Nest by putting another `[data-folder-tabs]` inside a panel and adding
 * `fldr-nested` to it.
 */
export function initFolderTabs(root = document) {
  root.querySelectorAll("[data-folder-tabs]").forEach(setup);
}

function setup(host) {
  const rail = host.querySelector(":scope > .fldr-rail");
  const strip = rail?.querySelector(":scope > .fldr-scroll");
  const tabs = strip ? [...strip.querySelectorAll('[role="tab"]')] : [];
  if (!tabs.length) return;

  // Roving focus: exactly one tab in the tab sequence, so Tab moves PAST the
  // strip rather than through every tab in it.
  tabs.forEach((t) => (t.tabIndex = t.dataset.state === "active" ? 0 : -1));

  const nextUsable = (from, step) => {
    for (let n = 0; n < tabs.length; n++) {
      from = (from + step + tabs.length) % tabs.length;
      if (!tabs[from].disabled) return from;
    }
    return -1;
  };

  function select(index) {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.dataset.state = on ? "active" : "inactive";
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      const panel = tab.getAttribute("aria-controls");
      if (panel) {
        const el = host.querySelector(`#${CSS.escape(panel)}`);
        if (el) el.hidden = !on;
      }
    });
    // With overflow, a tab chosen by keyboard can be off-screen. Focus that
    // cannot be seen is the failure that makes a scrolling tab strip unusable.
    tabs[index].scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => !tab.disabled && select(i));
    tab.addEventListener("keydown", (event) => {
      const map = { ArrowRight: 1, ArrowLeft: -1 };
      let target = null;
      if (event.key in map) target = nextUsable(i, map[event.key]);
      if (event.key === "Home") target = tabs[0].disabled ? nextUsable(0, 1) : 0;
      if (event.key === "End") target = nextUsable(0, -1);
      if (target === null || target < 0) return;
      event.preventDefault();
      select(target);
      tabs[target].focus();
    });
  });

  // Arrows: shown only on real overflow, and DISABLED at each end rather than
  // removed — a control that changes width under the cursor misfires.
  const arrows = rail.querySelector(":scope > .fldr-arrows");
  if (!arrows) return;
  const [left, right] = arrows.querySelectorAll(".fldr-arrow");

  const sync = () => {
    const over = strip.scrollWidth > strip.clientWidth + 1;
    arrows.dataset.overflowing = String(over);
    left.disabled = strip.scrollLeft <= 1;
    right.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1;
  };

  [left, right].forEach((button) =>
    button.addEventListener("click", () =>
      strip.scrollBy({ left: Number(button.dataset.dir) * Math.max(140, strip.clientWidth * 0.7) }),
    ),
  );

  strip.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  if (window.ResizeObserver) new ResizeObserver(sync).observe(strip);
  sync();
}
