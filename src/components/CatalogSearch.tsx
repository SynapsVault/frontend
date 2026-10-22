import React, { useCallback, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "../i18n/config.js";
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
  const { t } = useTranslation();

  const hasActiveFilters =
    !!filters.search ||
    !!filters.minPrice ||
    !!filters.maxPrice ||
    (filters.verificationStatus && filters.verificationStatus !== "all") ||
    (filters.resourceType && filters.resourceType !== "all");

  // ── Keyboard navigation state ──────────────────────────────────────────────

  const listboxId = useId();
  // Index of the currently focused result (-1 means none).
  const [selection, setSelection] = useState({ key: "", index: -1 });
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef ?? internalInputRef;
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const hasResults = results && results.length > 0;

  // Reset the active index after the results list changes, never during render.
  const resultsKey = results?.map((result) => result.id).join("\u0000");
  const activeIndex = selection.key === resultsKey ? selection.index : -1;
  const setActiveIndex = useCallback((next: number | ((previous: number) => number)) => {
    setSelection((previous) => {
      const index = previous.key === resultsKey ? previous.index : -1;
      return { key: resultsKey ?? "", index: typeof next === "function" ? next(index) : next };
    });
  }, [resultsKey]);

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
    [hasResults, results, activeIndex, onActivate, setActiveIndex],
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
    [results, onActivate, inputRef, setActiveIndex],
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
          aria-label={t("catalog.search_label")}
          aria-expanded={hasResults ? true : undefined}
          aria-controls={hasResults ? listboxId : undefined}
          aria-activedescendant={activeDescendant}
          aria-autocomplete={hasResults ? "list" : undefined}
          placeholder={t("catalog.search_placeholder")}
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          onKeyDown={handleInputKeyDown}
          className="synapse-input synapse-search__input"
        />
        <kbd className="synapse-kbd synapse-search__hint" aria-hidden="true">/</kbd>

        {/* Keyboard-navigable results list (#311) */}
        {hasResults && (
          <ul id={listboxId} role="listbox" aria-label={t("catalog.search_results")} className="synapse-listbox">
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
          aria-label={t("catalog.filter_verification_label")}
          value={filters.verificationStatus ?? "all"}
          onChange={(e) =>
            onChange({
              ...filters,
              verificationStatus: e.target.value as CatalogFilters["verificationStatus"],
            })
          }
          className="synapse-input synapse-select"
        >
          <option value="all">{t("catalog.all_statuses")}</option>
          <option value="verified">{t("status.verified")}</option>
          <option value="pending">{t("status.pending")}</option>
          <option value="rejected">{t("status.rejected")}</option>
        </select>

        <select
          aria-label={t("catalog.filter_type_label")}
          value={filters.resourceType ?? "all"}
          onChange={(e) =>
            onChange({
              ...filters,
              resourceType: e.target.value as CatalogFilters["resourceType"],
            })
          }
          className="synapse-input synapse-select"
        >
          <option value="all">{t("catalog.all_types")}</option>
          <option value="file">{t("catalog.type_file")}</option>
          <option value="link">{t("catalog.type_link")}</option>
        </select>

        <div className="synapse-search__price">
          <input
            type="number"
            aria-label={t("catalog.min_price_label")}
            placeholder={t("catalog.min_price_placeholder")}
            min="0"
            step="0.01"
            value={filters.minPrice ?? ""}
            onChange={(e) => onChange({ ...filters, minPrice: e.target.value })}
            className="synapse-input"
          />
          <span aria-hidden="true">–</span>
          <input
            type="number"
            aria-label={t("catalog.max_price_label")}
            placeholder={t("catalog.max_price_placeholder")}
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
            {t("catalog.toggle_filters")}
          </button>
        )}

        {hasActiveFilters && (
          <button onClick={onReset} className="synapse-btn synapse-btn--ghost synapse-btn--sm">
            {t("catalog.clear_filters")}
          </button>
        )}
      </div>

      {/* Count + sort share one row */}
      <div className="synapse-search__meta">
        <span className="synapse-search__count" aria-live="polite">
          {hasActiveFilters ? (
            <>
              <strong>{filtered}</strong> {t("catalog.filtered_of_total", { total })}
            </>
          ) : (
            <strong>{total}</strong>
          )}{" "}
          {t("catalog.resources_count", { count: total })}
        </span>
        {sortSlot}
      </div>
    </div>
  );
}
