"use client";

import * as React from "react";

import {
  applyChange,
  clearNamespace,
  readGridParams,
  writeGridParams,
} from "../core/url-state.mjs";
import { PAGE_SIZE_OPTIONS } from "../core/query.mjs";
import { describeCondition } from "../core/filter-model.mjs";

/**
 * DATA GRID for React. The only dependency is React itself.
 *
 * All the logic — parsing, validation, omit-defaults, reset rules, history mode
 * — lives in ../core, which is framework-agnostic and runs on a server too. This
 * file is the binding and the rendering, nothing more. That split is deliberate:
 * the rules a grid has to get right are not React's business, and keeping them
 * out of a component means the server can enforce the same ones.
 *
 *   import "vb-ui-data-grid/data-grid.css";
 */

export type SortDirection = "asc" | "desc";
export interface GridColumn<T> {
  id: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
  render?: (row: T) => React.ReactNode;
}
export interface GridFilterField {
  id: string;
  label: string;
  type?: "enum" | "text" | "number" | "date" | "boolean";
  options?: { value: string; label?: string }[];
}
export interface GridSegment {
  id: string;
  label: string;
  count?: number;
}

export interface GridError {
  code?: string;
  requestId?: string;
  message?: string;
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/* -------------------------------------------------------------------------- */

export interface UseGridUrlStateConfig {
  /** URL prefix. Two grids on one route must not share it. */
  namespace: string;
  sortableFields?: string[];
  filterFields?: Map<string, string>;
  segmentIds?: string[];
}

/**
 * Bind the grid's query to the address bar.
 *
 * Writes go through native `history.pushState` / `replaceState` rather than a
 * router call. In the Next.js App Router a `router.replace()` re-runs server
 * components on every keystroke; the native call updates the URL and lets the
 * client re-render, which is what rapid refinement actually needs.
 */
export function useGridUrlState(config: UseGridUrlStateConfig) {
  const { namespace } = config;
  const sortable = React.useMemo(
    () => new Set(config.sortableFields ?? []),
    [config.sortableFields],
  );

  const read = React.useCallback(
    () =>
      readGridParams(
        namespace,
        new URLSearchParams(typeof window === "undefined" ? "" : window.location.search),
        {
          sortableFields: sortable,
          filterFields: config.filterFields,
          segmentIds: config.segmentIds,
        },
      ),
    [namespace, sortable, config.filterFields, config.segmentIds],
  );

  const [state, setState] = React.useState(read);

  React.useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [read]);

  const setQuery = React.useCallback(
    (next: any, change: string) => {
      const result = applyChange(next, change as any);
      const search = writeGridParams(
        namespace,
        result.query,
        new URLSearchParams(window.location.search),
      );
      const qs = search.toString();
      const url = qs
        ? `${window.location.pathname}?${qs}${window.location.hash}`
        : window.location.pathname;
      if (result.history === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
      setState({ query: result.query, droppedFilterFields: state.droppedFilterFields });
      return result;
    },
    [namespace, state.droppedFilterFields],
  );

  const resetAll = React.useCallback(() => {
    const search = clearNamespace(namespace, new URLSearchParams(window.location.search));
    const qs = search.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
    setState(read());
  }, [namespace, read]);

  return { query: state.query, droppedFilterFields: state.droppedFilterFields, setQuery, resetAll };
}

/* -------------------------------------------------------------------------- */

/**
 * Fetch rows for a query, cancelling anything already in flight.
 *
 * `status` distinguishes the first load from a refresh, because they must look
 * different: replacing rows with a spinner on every refresh throws away whatever
 * the person was reading.
 */
export function useGridData<T>(
  query: any,
  load: (q: any, signal: AbortSignal) => Promise<{ rows: T[]; total?: number }>,
) {
  const [state, setState] = React.useState<{
    status: "loading" | "refreshing" | "ready" | "error";
    rows: T[];
    total: number | null;
    error: GridError | null;
  }>({ status: "loading", rows: [], total: null, error: null });

  const loadRef = React.useRef(load);
  loadRef.current = load;
  const key = JSON.stringify(query);

  const run = React.useCallback(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, status: s.rows.length ? "refreshing" : "loading" }));
    (async () => {
      try {
        const params = writeGridParams("", query).toString();
        const result = await loadRef.current({ ...query, searchParams: params }, controller.signal);
        if (controller.signal.aborted) return;
        setState({
          status: "ready",
          rows: result.rows ?? [],
          total: result.total ?? null,
          error: null,
        });
      } catch (error: any) {
        if (controller.signal.aborted || error?.name === "AbortError") return;
        setState((s) => ({ ...s, status: "error", error }));
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  React.useEffect(() => run(), [run]);
  return { ...state, refresh: run };
}

/* -------------------------------------------------------------------------- */

export interface DataGridProps<T> {
  namespace: string;
  columns: GridColumn<T>[];
  filters?: GridFilterField[];
  segments?: GridSegment[];
  rows: T[];
  total?: number | null;
  status: "loading" | "refreshing" | "ready" | "error";
  error?: GridError | null;
  query: any;
  onQueryChange: (next: any, change: string) => void;
  onReset?: () => void;
  onRetry?: () => void;
  droppedFilterFields?: string[];
  getRowId?: (row: T) => string;
  selectable?: boolean;
  selection?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
  emptyMessage?: string;
  searchPlaceholder?: string;
}

export function DataGrid<T extends Record<string, any>>({
  namespace,
  columns,
  filters = [],
  segments = [],
  rows,
  total = null,
  status,
  error = null,
  query,
  onQueryChange,
  onReset,
  onRetry,
  droppedFilterFields = [],
  getRowId = (row: any) => row.id,
  selectable = false,
  selection,
  onSelectionChange,
  emptyMessage = "Nothing here yet.",
  searchPlaceholder = "Search…",
}: DataGridProps<T>) {
  const [draft, setDraft] = React.useState(query.q ?? "");
  React.useEffect(() => setDraft(query.q ?? ""), [query.q]);

  // One request per keystroke is how you rate-limit yourself.
  React.useEffect(() => {
    if (draft === (query.q ?? "")) return;
    const t = setTimeout(() => onQueryChange({ ...query, q: draft }, "search"), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const chosen = selection ?? new Set<string>();
  const toggle = (id: string) => {
    const next = new Set(chosen);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectionChange?.(next);
  };

  const filtered = Boolean(query.q || query.filter?.conditions?.length || query.segment);
  const pages = total === null ? null : Math.max(1, Math.ceil(total / query.pageSize));
  const from = (query.page - 1) * query.pageSize + 1;
  const to = total === null ? from + rows.length - 1 : Math.min(query.page * query.pageSize, total);

  return (
    <div className="dg">
      {segments.length > 0 && (
        <div className="dg-segments" role="tablist">
          {segments.map((seg) => (
            <button
              key={seg.id}
              type="button"
              role="tab"
              className="dg-segment"
              aria-selected={(query.segment ?? segments[0]?.id) === seg.id}
              onClick={() =>
                onQueryChange(
                  { ...query, segment: seg.id === segments[0]?.id ? undefined : seg.id },
                  "segment",
                )
              }
            >
              {seg.label}
              {seg.count !== undefined && <span className="dg-segment-count">{seg.count}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="dg-toolbar">
        <div className="dg-search">
          <span className="dg-search-icon" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            type="search"
            value={draft}
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && draft) setDraft("");
            }}
          />
          {draft && (
            <button
              type="button"
              className="dg-search-clear"
              aria-label="Clear search"
              onClick={() => setDraft("")}
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {filters.map((field) => (
          <FilterMenu
            key={field.id}
            field={field}
            namespace={namespace}
            query={query}
            onQueryChange={onQueryChange}
          />
        ))}

        <div className="dg-toolbar-spacer" />
        {filtered && onReset && (
          <button type="button" className="dg-btn" onClick={onReset}>
            Reset
          </button>
        )}
      </div>

      {(query.filter?.conditions?.length > 0 || droppedFilterFields.length > 0) && (
        <div className="dg-chips">
          {query.filter.conditions.map((condition: any, i: number) => (
            <span key={i} className="dg-chip">
              {describeCondition(
                condition,
                filters.find((f) => f.id === condition.field),
              )}
              <button
                type="button"
                aria-label={`Remove filter ${condition.field}`}
                onClick={() =>
                  onQueryChange(
                    {
                      ...query,
                      filter: {
                        conjunction: "and",
                        conditions: query.filter.conditions.filter((c: any) => c !== condition),
                      },
                    },
                    "filter",
                  )
                }
              >
                <CloseIcon />
              </button>
            </span>
          ))}
          {/* A link naming filters that no longer exist must SAY so, or the
              recipient silently sees different data than the sender. */}
          {droppedFilterFields.length > 0 && (
            <span className="dg-chip dg-chip-warn" role="status">
              {droppedFilterFields.length} filter{droppedFilterFields.length > 1 ? "s" : ""} from
              this link no longer exist
            </span>
          )}
        </div>
      )}

      {selectable && chosen.size > 0 && (
        <div className="dg-selection" role="status">
          <span>
            <strong>{chosen.size}</strong> selected on this page
          </span>
          <button type="button" className="dg-btn" onClick={() => onSelectionChange?.(new Set())}>
            Clear
          </button>
        </div>
      )}

      <div className={cx("dg-frame", status === "refreshing" && "dg-refreshing")}>
        {status === "loading" ? (
          <Skeleton columns={columns.length + (selectable ? 1 : 0)} />
        ) : status === "error" ? (
          <ErrorState error={error} namespace={namespace} onRetry={onRetry} />
        ) : rows.length === 0 ? (
          filtered ? (
            <State
              kind="nomatch"
              title="No results match"
              body="No rows match the current search and filters."
              actions={
                <button
                  type="button"
                  className="dg-btn"
                  onClick={() =>
                    onQueryChange(
                      {
                        ...query,
                        q: "",
                        filter: { conjunction: "and", conditions: [] },
                        segment: undefined,
                      },
                      "reset",
                    )
                  }
                >
                  Clear search and filters
                </button>
              }
            />
          ) : (
            <State kind="empty" title="Nothing here yet" body={emptyMessage} />
          )
        ) : (
          <div className="dg-scroll">
            <table className="dg-table">
              <Head
                columns={columns}
                query={query}
                onQueryChange={onQueryChange}
                selectable={selectable}
                rows={rows}
                getRowId={getRowId}
                chosen={chosen}
                onSelectionChange={onSelectionChange}
              />
              <tbody>
                {rows.map((row) => {
                  const id = getRowId(row);
                  return (
                    <tr key={id} aria-selected={selectable ? chosen.has(id) : undefined}>
                      {selectable && (
                        <td className="dg-checkbox">
                          <input
                            type="checkbox"
                            checked={chosen.has(id)}
                            onChange={() => toggle(id)}
                            aria-label={`Select ${String(row[columns[0].id] ?? id)}`}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.id} className={col.align === "right" ? "dg-num" : undefined}>
                          {col.render ? col.render(row) : (row[col.id] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {status !== "error" && (
        <div className="dg-pagination">
          <span className="dg-count">
            {rows.length ? `${from}–${to}` : "0"}
            {total === null ? " shown" : ` of ${total.toLocaleString()}`}
          </span>
          <div className="dg-toolbar-spacer" />
          <label>
            Rows{" "}
            <select
              aria-label="Rows per page"
              value={query.pageSize}
              onChange={(e) =>
                onQueryChange({ ...query, pageSize: Number(e.target.value) }, "pageSize")
              }
            >
              {PAGE_SIZE_OPTIONS.map((n: number) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="dg-page-buttons">
            <button
              type="button"
              className="dg-btn"
              disabled={query.page <= 1}
              onClick={() => onQueryChange({ ...query, page: query.page - 1 }, "page")}
            >
              Previous
            </button>
            <button
              type="button"
              className="dg-btn"
              disabled={pages !== null ? query.page >= pages : rows.length < query.pageSize}
              onClick={() => onQueryChange({ ...query, page: query.page + 1 }, "page")}
            >
              Next
            </button>
          </div>
          {pages && (
            <span>
              Page {query.page} of {pages}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* --- pieces --------------------------------------------------------------- */

const CloseIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

function Head<T>({
  columns,
  query,
  onQueryChange,
  selectable,
  rows,
  getRowId,
  chosen,
  onSelectionChange,
}: any) {
  const allOnPage = rows.length > 0 && rows.every((r: T) => chosen.has(getRowId(r)));
  return (
    <thead>
      <tr>
        {selectable && (
          <th className="dg-checkbox">
            <input
              type="checkbox"
              checked={allOnPage}
              aria-label="Select all rows on this page"
              onChange={(e) => {
                const next = new Set<string>(chosen);
                for (const row of rows)
                  e.target.checked ? next.add(getRowId(row)) : next.delete(getRowId(row));
                onSelectionChange?.(next);
              }}
            />
          </th>
        )}
        {columns.map((col: GridColumn<T>) => {
          const active = query.sort.find((s: any) => s.field === col.id);
          return (
            <th
              key={col.id}
              scope="col"
              className={col.align === "right" ? "dg-num" : undefined}
              aria-sort={
                active
                  ? active.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : col.sortable
                    ? "none"
                    : undefined
              }
            >
              {col.sortable ? (
                <button
                  type="button"
                  className="dg-sort"
                  onClick={() =>
                    onQueryChange(
                      {
                        ...query,
                        sort: [
                          {
                            field: col.id,
                            direction: active?.direction === "asc" ? "desc" : "asc",
                          },
                        ],
                      },
                      "sort",
                    )
                  }
                >
                  {col.label}
                  <svg
                    className="dg-sort-arrow"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              ) : (
                col.label
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

function FilterMenu({ field, namespace, query, onQueryChange }: any) {
  const id = React.useId().replace(/:/g, "");
  const popId = `dg-pop-${namespace}-${field.id}-${id}`;
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popRef = React.useRef<HTMLDivElement>(null);
  const current = query.filter?.conditions?.find((c: any) => c.field === field.id);
  const [chosen, setChosen] = React.useState<Set<string>>(new Set(current?.values ?? []));
  React.useEffect(() => setChosen(new Set(current?.values ?? [])), [current?.values?.join("|")]);

  // Native popovers have no cross-browser anchoring yet, so place it ourselves
  // rather than take a positioning dependency for one menu.
  React.useEffect(() => {
    const pop = popRef.current;
    if (!pop) return;
    const place = (e: any) => {
      if (e.newState !== "open" || !triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      pop.style.left = `${Math.min(r.left, window.innerWidth - 240)}px`;
      pop.style.top = `${r.bottom + 6}px`;
    };
    pop.addEventListener("beforetoggle", place);
    return () => pop.removeEventListener("beforetoggle", place);
  }, []);

  const apply = (values: Set<string>) => {
    popRef.current?.hidePopover?.();
    const others = (query.filter?.conditions ?? []).filter((c: any) => c.field !== field.id);
    const next = values.size
      ? [...others, { field: field.id, operator: "in", values: [...values] }]
      : others;
    onQueryChange({ ...query, filter: { conjunction: "and", conditions: next } }, "filter");
  };

  return (
    <span>
      <button ref={triggerRef} type="button" className="dg-btn" popoverTarget={popId}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M3 5h18M6 12h12M10 19h4" />
        </svg>
        {field.label}
        {chosen.size > 0 && <span className="dg-segment-count">{chosen.size}</span>}
      </button>
      <div ref={popRef} id={popId} className="dg-pop" popover="auto">
        <div className="dg-pop-title">{field.label}</div>
        {(field.options ?? []).map((opt: any) => (
          <label key={opt.value} className="dg-opt">
            <input
              type="checkbox"
              checked={chosen.has(opt.value)}
              onChange={(e) => {
                const next = new Set(chosen);
                e.target.checked ? next.add(opt.value) : next.delete(opt.value);
                setChosen(next);
              }}
            />
            {opt.label ?? opt.value}
          </label>
        ))}
        <div className="dg-pop-actions">
          <button type="button" className="dg-btn dg-btn-primary" onClick={() => apply(chosen)}>
            Apply
          </button>
          <button
            type="button"
            className="dg-btn"
            onClick={() => {
              setChosen(new Set());
              apply(new Set());
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </span>
  );
}

function State({ kind, title, body, actions, meta }: any) {
  return (
    <div className={`dg-state dg-state-${kind}`}>
      <div className="dg-state-icon" aria-hidden="true">
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {kind === "error" ? (
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16.5v.01" />
            </>
          ) : (
            <>
              <path d="M4 7h16v12H4z" />
              <path d="M4 11h16" />
            </>
          )}
        </svg>
      </div>
      <div className="dg-state-title">{title}</div>
      {body && <div className="dg-state-body">{body}</div>}
      {actions && <div className="dg-state-actions">{actions}</div>}
      {meta && <div className="dg-state-meta">{meta}</div>}
    </div>
  );
}

function ErrorState({
  error,
  namespace,
  onRetry,
}: {
  error: GridError | null;
  namespace: string;
  onRetry?: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  const copy = async () => {
    // Deliberately narrow: a code, an id, where and when. No tokens, no row
    // data, no stack — a diagnostic someone can paste into a ticket safely.
    const lines = [
      `Error: ${error?.code ?? "UNKNOWN"}`,
      `Request ID: ${error?.requestId ?? "not available"}`,
      `Page: ${window.location.pathname}`,
      `Grid: ${namespace}`,
      `Time: ${new Date().toISOString()}`,
      `Online: ${navigator.onLine ? "yes" : "no"}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <State
      kind="error"
      title={offline ? "You are offline" : "This list could not be loaded"}
      body={
        offline
          ? "The rows below could not be refreshed. Your filters are still saved."
          : "This is not a count of zero — the result is unknown. Your filters and sorting are still saved."
      }
      meta={[error?.code, error?.requestId].filter(Boolean).join(" · ") || undefined}
      actions={
        <>
          {onRetry && (
            <button type="button" className="dg-btn" onClick={onRetry}>
              Try again
            </button>
          )}
          {(error?.code || error?.requestId) && (
            <button type="button" className="dg-btn" onClick={copy}>
              {copied ? "Copied" : "Copy error details"}
            </button>
          )}
        </>
      }
    />
  );
}

function Skeleton({ columns }: { columns: number }) {
  return (
    <div className="dg-scroll" aria-busy="true">
      <table className="dg-table">
        <tbody>
          {Array.from({ length: 6 }, (_, r) => (
            <tr key={r} className="dg-skeleton-row">
              {Array.from({ length: columns }, (_, c) => (
                <td key={c}>
                  <span
                    className="dg-skeleton-cell"
                    style={{ width: `${40 + ((r * 37 + c * 11) % 5) * 12}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
