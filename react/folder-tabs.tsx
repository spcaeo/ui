"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * THE tab control — one component, every tabbed surface in the product.
 *
 * Rebuilt from the Windows tab control, whose mechanism is three fills in a
 * fixed relationship: the rail is darkest, an inactive tab sits on it, and the
 * ACTIVE TAB IS THE PANEL'S OWN FILL. It is not highlighted — it is the panel,
 * continuing upward. Shape and shared fill carry the state, and both survive a
 * greyscale print, which matters in a product where a supervisor and a leader
 * see different things and being on the wrong tab has consequences.
 *
 * What the earlier tab component got wrong, and why this replaces it: it had
 * the folder REASONING but rendered a white tab on a white page with rounded
 * corners, and the one screen using it stripped the panel border — so the
 * active tab had nothing to join to and read as a floating outline. Alongside
 * the grid's segment row it left two rows of near-identical weight with nothing
 * saying which was the outer level.
 *
 * The visuals live in `globals.css` under `@layer components`, not in utility
 * classes here. This is one coherent control: change a fill in isolation and
 * the join stops reading, so the fills belong together where that is obvious.
 *
 * Radix underneath, so roving focus, arrow keys, Home/End, `aria-controls` and
 * the disabled-tab skip are the primitive's job rather than ours.
 */

type FolderTabsProps = React.ComponentProps<typeof TabsPrimitive.Root> & {
  /**
   * A tab control INSIDE another tab panel. Smaller, so level two is
   * unmistakably inside level one — same fills, because it is the same kind of
   * thing one level down, and a second colourway would claim otherwise.
   */
  nested?: boolean;
};

const NestedContext = React.createContext(false);

export function FolderTabs({ nested = false, className, ...props }: FolderTabsProps) {
  return (
    <NestedContext.Provider value={nested}>
      <TabsPrimitive.Root
        data-slot="folder-tabs"
        className={cn(nested && "fldr-nested", className)}
        {...props}
      />
    </NestedContext.Provider>
  );
}

/**
 * The rail: the band the tabs stand on, plus its own overflow arrows.
 *
 * The arrows are INSIDE it deliberately — they are part of the control, not
 * furniture beside it — and they DISABLE at each end rather than disappearing.
 * A control that changes width under the cursor is a control that misfires.
 */
export function FolderTabsRail({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [overflowing, setOverflowing] = React.useState(false);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(true);

  const sync = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const over = el.scrollWidth > el.clientWidth + 1;
    setOverflowing(over);
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    sync();
    // Tabs can change after mount — a count arrives, a role hides one — so the
    // arrows follow the element rather than being decided once at mount.
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const nudge = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(140, el.clientWidth * 0.7) });
  };

  return (
    <TabsPrimitive.List data-slot="folder-tabs-rail" className={cn("fldr-rail", className)} {...props}>
      <div ref={scrollRef} className="fldr-scroll" onScroll={sync}>
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
          <ChevronLeft className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="fldr-arrow"
          aria-label="Scroll tabs right"
          disabled={atEnd}
          tabIndex={-1}
          onClick={() => nudge(1)}
        >
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </TabsPrimitive.List>
  );
}

/**
 * One tab.
 *
 * `scrollIntoView` on selection is not a flourish: with overflow, arrow-keying
 * to a tab off the right-hand edge would otherwise move focus somewhere the
 * person cannot see, which is the accessibility failure that makes a scrolling
 * tab strip unusable by keyboard.
 */
export function FolderTab({
  className,
  onFocus,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="folder-tab"
      className={cn("fldr-tab", className)}
      onFocus={(event) => {
        event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
        onFocus?.(event);
      }}
      {...props}
    />
  );
}

/**
 * The panel. Shares the active tab's fill — if this takes a different ground
 * the join disappears and the control is back to identifying itself with a
 * faint tint.
 *
 * `flush` for a panel whose content brings its own card and padding, such as a
 * grid: without it the panel boxes a box.
 */
export function FolderTabsPanel({
  flush = false,
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content> & { flush?: boolean }) {
  return (
    <TabsPrimitive.Content
      data-slot="folder-tabs-panel"
      className={cn("fldr-panel", flush && "fldr-panel-flush", "outline-none", className)}
      {...props}
    />
  );
}

/** A count beside a label. Quiet — the label is the thing being read. */
export function FolderTabCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 rounded-full bg-white/15 px-1.5 py-0.5 text-[11px] tabular-nums">
      {children}
    </span>
  );
}
