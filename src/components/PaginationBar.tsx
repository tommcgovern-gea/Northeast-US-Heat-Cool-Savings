"use client";

import { useEffect, useState } from "react";

export interface PaginationBarProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
  loading?: boolean;
  /** 'compact' = bar only. 'full' = with "Showing X to Y of Z results" on left (e.g. below table). */
  variant?: "compact" | "full";
  itemLabel?: string;
  /** 'top' = limit selector only (above table). 'bottom' = range + Prev/Next only (below table). Omit for single block. */
  part?: "top" | "bottom" | "all";
}

const defaultLimitOptions = [10, 20];

export function PaginationBar({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  limitOptions = defaultLimitOptions,
  loading = false,
  variant = "compact",
  itemLabel = "results",
  part = "all",
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const [pageInput, setPageInput] = useState(String(page));
  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const jumpToPage = () => {
    const n = parseInt(pageInput, 10);
    if (Number.isNaN(n)) {
      setPageInput(String(page));
      return;
    }
    const clamped = Math.min(Math.max(n, 1), totalPages);
    setPageInput(String(clamped));
    if (clamped !== page) onPageChange(clamped);
  };

  const rangeText =
    total > 0
      ? `${page > 1 ? (page - 1) * limit + 1 : 1}–${end} of ${total}`
      : "";

  const prevDisabled = loading || page <= 1;
  const nextDisabled = loading || page >= totalPages;

  const buttonClass =
    "px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";

  const goToPageControl =
    totalPages > 1 ? (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-800 whitespace-nowrap">Go to page</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onBlur={jumpToPage}
          onKeyDown={(e) => {
            if (e.key === "Enter") jumpToPage();
          }}
          disabled={loading}
          className="w-11 rounded border-gray-300 text-sm text-center py-1 px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-sm text-gray-500 whitespace-nowrap">of {totalPages}</span>
      </div>
    ) : null;

  const limitRow =
    (part === "all" || part === "top") && onLimitChange ? (
      <div className="flex justify-end mb-4">
        <span className="text-sm text-gray-800">
          Show
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="mx-1.5 rounded border-gray-300 text-sm py-0.5"
          >
            {limitOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          per page
        </span>
      </div>
    ) : null;

  const prevNextRow = part === "all" || part === "bottom" ? (
    <div
      className={`flex flex-wrap items-center gap-4 ${part === "bottom" ? "mt-4" : ""} ${
        variant === "full" && total > 0 ? "justify-between" : "justify-end"
      }`}
    >
      {variant === "full" && total > 0 && (
        <span className="text-sm text-gray-700">
          Showing <span className="font-medium">{start}</span> to{" "}
          <span className="font-medium">{end}</span> of{" "}
          <span className="font-medium">{total}</span> {itemLabel}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-4">
        {total > 0 && <span className="text-sm text-gray-800">{rangeText}</span>}
        {goToPageControl}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={prevDisabled}
            className={buttonClass}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={nextDisabled}
            className={buttonClass}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (part === "top") return <>{limitRow}</>;
  if (part === "bottom") return <>{prevNextRow}</>;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-y-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5">
      <span className="text-sm text-gray-700">
        {variant === "full" && total > 0 ? (
          <>
            Showing <span className="font-medium">{start}</span> to{" "}
            <span className="font-medium">{end}</span> of{" "}
            <span className="font-medium">{total}</span> {itemLabel}
          </>
        ) : (
          rangeText
        )}
      </span>
      <div className="flex flex-wrap items-center divide-x divide-gray-300">
        {onLimitChange && (
          <span className="pr-4 text-sm text-gray-800 whitespace-nowrap">
            Show
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="mx-1.5 rounded border-gray-300 text-sm py-0.5"
            >
              {limitOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            per page
          </span>
        )}
        {goToPageControl && <div className="px-4">{goToPageControl}</div>}
        <div className="flex gap-2 pl-4">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={prevDisabled}
            className={buttonClass}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={nextDisabled}
            className={buttonClass}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
