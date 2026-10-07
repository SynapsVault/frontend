import React, { useCallback, useId, useRef, useState } from "react";
import type { CatalogFilters } from "../api/resources.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult {
  id: string;
  title: string;
  /** Optional secondary text shown below the title in the results list. */
  subtitle?: string;
}

interface Props {
  filters: CatalogFilters;
  total: number;
  filtered: number;
  onChange: (filters: CatalogFilters) => void;
  onReset: () => void;
  /** When provided, renders a keyboard-navigable results list below the search box. */
  results?: SearchResult[];
  /** Called when a result is activated (Enter key or click). */
  onActivate?: (result: SearchResult) => void;
  /** Ref forwarded to the search input so the parent can focus it programmatically. */
  searchInputRef?: React.RefObject<HTMLInputElement>;
  /** Called when the filter row should be toggled (e.g. via the `f` shortcut). */
  onToggleFilters?: () => void;
  /** Sort control rendered on the same row as the result count. */
  sortSlot?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// CatalogSearch
// ---------------------------------------------------------------------------

export function CatalogSearch({
  filters,
  total,
  filtered,
  onChange,
  onReset,
  results,
  onActivate,
  searchInputRef,
  onToggleFilters,
  sortSlot,
}: Props) {
  const hasActiveFilters =
    !!filters.search ||
    !!filters.minPrice ||
    !!filters.maxPrice ||
    (filters.verificationStatus && filters.verificationStatus !== "all") ||
    (filters.resourceType && filters.resourceType !== "all");

  // ── Keyboard navigation state ──────────────────────────────────────────────

  const listboxId = useId();
  // Index of the currently focused result (-1 means none).
  const [activeIndex, setActiveIndex] = useState(-1);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef ?? internalInputRef;
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const hasResults = results && results.length > 0;

  // Reset the active index whenever the results list changes.
  const prevResultsRef = useRef<SearchResult[] | undefined>(undefined);
  if (results !== prevResultsRef.current) {
    prevResultsRef.current = results;
    // Only reset if there's a real change (avoids resetting on stable renders).
    if (activeIndex !== -1) setActiveIndex(-1);
  }

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!hasResults) return;
      const count = results!.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1 >= count ? 0 : prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 < 0 ? count - 1 : prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < count) {
          onActivate?.(results![activeIndex]);
          setActiveIndex(-1);
        }
      } else if (e.key === "Escape") {
        setActiveIndex(-1);
      }
    },
    [hasResults, results, activeIndex, onActivate],
  );

  const handleItemKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLLIElement>, index: number, result: SearchResult) => {
      const count = results?.length ?? 0;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = (index + 1) % count;
        setActiveIndex(next);
        itemRefs.current[next]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (index === 0) {
          setActiveIndex(-1);
          inputRef.current?.focus();
        } else {
          const prev = index - 1;
          setActiveIndex(prev);
          itemRefs.current[prev]?.focus();
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate?.(result);
        setActiveIndex(-1);
        inputRef.current?.focus();
      } else if (e.key === "Escape") {
        setActiveIndex(-1);
        inputRef.current?.focus();
      }
    },
    [results, onActivate, inputRef],
  );

  const activeDescendant =
    hasResults && activeIndex >= 0 ? `${listboxId}-item-${activeIndex}` : undefined;

  return (
    <div className="synapse-search">
      {/* Search box */}
      <div className="synapse-search__field">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="synapse-search__icon"
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          role={hasResults ? "combobox" : undefined}
          aria-label="Search resources"
          aria-expanded={hasResults ? true : undefined}
          aria-controls={hasResults ? listboxId : undefined}
          aria-activedescendant={activeDescendant}
          aria-autocomplete={hasResults ? "list" : undefined}
          placeholder="Search by title…"
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          onKeyDown={handleInputKeyDown}
          className="synapse-input synapse-search__input"
        />
        <kbd className="synapse-kbd synapse-search__hint" aria-hidden="true">/</kbd>

        {/* Keyboard-navigable results list (#311) */}
        {hasResults && (
          <ul id={listboxId} role="listbox" aria-label="Search results" className="synapse-listbox">
            {results!.map((result, index) => {
              const isActive = index === activeIndex;
              return (
                <li
                  key={result.id}
                  id={`${listboxId}-item-${index}`}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  role="option"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(e) => handleItemKeyDown(e, index, result)}
                  onClick={() => {
                    onActivate?.(result);
                    setActiveIndex(-1);
                    inputRef.current?.focus();
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className="synapse-listbox__option"
                >
                  <span className="block font-medium">{result.title}</span>
                  {result.subtitle && (
                    <span className="block text-xs text-fg-muted">{result.subtitle}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Filter row */}
      <div id="catalog-filter-row" className="synapse-search__filters">
        <select
          aria-label="Filter by verification status"
          value={filters.verificationStatus ?? "all"}
          onChange={(e) =>
            onChange({
              ...filters,
              verificationStatus: e.target.value as CatalogFilters["verificationStatus"],
            })
          }
          className="synapse-input synapse-select"
        >
          <option value="all">All statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          aria-label="Filter by resource type"
          value={filters.resourceType ?? "all"}
          onChange={(e) =>
            onChange({
              ...filters,
              resourceType: e.target.value as CatalogFilters["resourceType"],
            })
          }
          className="synapse-input synapse-select"
        >
          <option value="all">All types</option>
          <option value="file">File</option>
          <option value="link">Link</option>
        </select>

        <div className="synapse-search__price">
          <input
            type="number"
            aria-label="Minimum price in USDC"
            placeholder="Min"
            min="0"
            step="0.01"
            value={filters.minPrice ?? ""}
            onChange={(e) => onChange({ ...filters, minPrice: e.target.value })}
            className="synapse-input"
          />
          <span aria-hidden="true">–</span>
          <input
            type="number"
            aria-label="Maximum price in USDC"
            placeholder="Max"
            min="0"
            step="0.01"
            value={filters.maxPrice ?? ""}
            onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
            className="synapse-input"
          />
          <span className="synapse-search__unit">USDC</span>
        </div>

        {onToggleFilters && (
          <button
            type="button"
            onClick={onToggleFilters}
            aria-controls="catalog-filter-row"
            className="synapse-btn synapse-btn--ghost synapse-btn--sm"
          >
            Toggle filters
          </button>
        )}

        {hasActiveFilters && (
          <button onClick={onReset} className="synapse-btn synapse-btn--ghost synapse-btn--sm">
            Clear filters
          </button>
        )}
      </div>

      {/* Count + sort share one row */}
      <div className="synapse-search__meta">
        <span className="synapse-search__count" aria-live="polite">
          {hasActiveFilters ? (
            <>
              <strong>{filtered}</strong> of {total}
            </>
          ) : (
            <strong>{total}</strong>
          )}{" "}
          resource{total !== 1 ? "s" : ""}
        </span>
        {sortSlot}
      </div>
    </div>
  );
}
