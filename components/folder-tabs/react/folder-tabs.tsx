"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

/**
 * VB-INSPIRED FOLDER TABS — one control, every tabbed surface.
 *
 * Rebuilt from the Visual Basic 4 SSTab control, whose mechanism is three fills
 * in a fixed relationship: the rail is darkest, an inactive tab sits on it, and
 * the ACTIVE TAB IS THE PANEL'S OWN FILL. It is not highlighted — it is the
 * panel, continuing upward. Shape and shared fill carry the state, and both
 * survive a greyscale print, which matters anywhere being on the wrong tab has
 * consequences.
 *
 * The visuals live in `folder-tabs.css`, not in utility classes here. This is
 * one coherent control: change a fill in isolation and the join stops reading,
 * so the fills belong together where that is obvious. Import it once:
 *
 *   import "@spcaeo/folder-tabs/folder-tabs.css";
 *
 * The ONLY runtime dependency is `@radix-ui/react-tabs`, which gives us roving
 * focus, arrow keys, Home/End, `aria-controls`/`aria-labelledby` pairing and the
 * disabled-tab skip. No Tailwind, no icon library, no `cn` helper.
 */

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/*
  Bring a tab fully into view by moving the strip's own scrollLeft. The obvious
  `scrollIntoView` walks every scrollable ancestor including the document, so
  arrow-keying along the strip can jump the whole page — worse than the problem
  it solves.
*/
function revealInStrip(tab: HTMLElement) {
  const strip = tab.closest<HTMLElement>(".fldr-scroll");
  if (!strip) return;
  const pad = 12;
  const left = tab.offsetLeft - pad;
  const right = tab.offsetLeft + tab.offsetWidth + pad;
  if (left < strip.scrollLeft) strip.scrollLeft = left;
  else if (right > strip.scrollLeft + strip.clientWidth) {
    strip.scrollLeft = right - strip.clientWidth;
  }
}

export type FolderTabsProps = React.ComponentProps<typeof TabsPrimitive.Root> & {
  /**
   * A tab control INSIDE another tab panel. Smaller, so level two is
   * unmistakably inside level one — same fills, because it is the same kind of
   * thing one level down, and a second colourway would claim otherwise.
   */
  nested?: boolean;
};

export function FolderTabs({ nested = false, className, ...props }: FolderTabsProps) {
  return (
    <TabsPrimitive.Root
      data-slot="folder-tabs"
      className={cx(nested && "fldr-nested", className)}
      {...props}
    />
  );
}

export type FolderTabsRailProps = React.ComponentProps<typeof TabsPrimitive.List>;

/**
 * The rail: the band the tabs stand on, plus its own overflow arrows.
 *
 * The arrows are INSIDE it deliberately — they are part of the control, not
 * furniture beside it — and they DISABLE at each end rather than disappearing.
 * A control that changes width under the cursor is a control that misfires.
 */
export function FolderTabsRail({ className, children, ...props }: FolderTabsRailProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const frame = React.useRef(0);
  const [overflowing, setOverflowing] = React.useState(false);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(true);

  const sync = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setOverflowing(max > 1);
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  // Scroll fires once per frame; measuring layout on every one of those is the
  // easiest way to make a smooth strip feel slow.
  const queueSync = React.useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(sync);
  }, [sync]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    sync();
    // Tabs can change after mount — a count arrives, a role hides one — so the
    // arrows follow the elements rather than being decided once at mount.
    const observer = new ResizeObserver(queueSync);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    window.addEventListener("resize", queueSync);
    return () => {
      cancelAnimationFrame(frame.current);
      observer.disconnect();
      window.removeEventListener("resize", queueSync);
    };
  }, [sync, queueSync]);

  const nudge = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(140, el.clientWidth * 0.7) });
  };

  return (
    <TabsPrimitive.List
      data-slot="folder-tabs-rail"
      className={cx("fldr-rail", className)}
      {...props}
    >
      <div ref={scrollRef} className="fldr-scroll" onScroll={queueSync}>
        {children}
      </div>

      <div className="fldr-arrows" data-overflowing={overflowing}>
        <button
          type="button"
          className="fldr-arrow"
          aria-label="Scroll tabs left"
          disabled={atStart}
          // A scroll control is not a tab. Kept out of the tab sequence so
          // arrow-keying along the strip never lands on it.
          tabIndex={-1}
          onClick={() => nudge(-1)}
        >
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          className="fldr-arrow"
          aria-label="Scroll tabs right"
          disabled={atEnd}
          tabIndex={-1}
          onClick={() => nudge(1)}
        >
          <Chevron direction="right" />
        </button>
      </div>
    </TabsPrimitive.List>
  );
}

/** Inline so the package needs no icon library for two glyphs. */
function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

export type FolderTabProps = React.ComponentProps<typeof TabsPrimitive.Trigger>;

/**
 * One tab.
 *
 * Revealing it on focus is not a flourish: with overflow, arrow-keying to a tab
 * off the right-hand edge would otherwise move focus somewhere the person cannot
 * see, which is the failure that makes a scrolling tab strip unusable by
 * keyboard.
 */
export function FolderTab({ className, onFocus, ...props }: FolderTabProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="folder-tab"
      className={cx("fldr-tab", className)}
      onFocus={(event) => {
        revealInStrip(event.currentTarget);
        onFocus?.(event);
      }}
      {...props}
    />
  );
}

export type FolderTabsPanelProps = React.ComponentProps<typeof TabsPrimitive.Content> & {
  /**
   * For a panel whose content brings its own card and padding, such as a grid:
   * without it the panel boxes a box. It tightens the padding but KEEPS the
   * ground and the side walls — drop those and the rail floats above nothing.
   */
  flush?: boolean;
};

/**
 * The panel. Shares the active tab's fill — if this takes a different ground the
 * join disappears and the control is back to identifying itself with a faint
 * tint.
 */
export function FolderTabsPanel({ flush = false, className, ...props }: FolderTabsPanelProps) {
  return (
    <TabsPrimitive.Content
      data-slot="folder-tabs-panel"
      // Focusable, because Radix moves focus here when the panel has no
      // focusable content of its own — that is the ARIA tab pattern.
      tabIndex={0}
      className={cx("fldr-panel", flush && "fldr-panel-flush", className)}
      {...props}
    />
  );
}

/** A count beside a label. Quiet — the label is the thing being read. */
export function FolderTabCount({ children, className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cx("fldr-count", className)} {...props}>
      {children}
    </span>
  );
}
