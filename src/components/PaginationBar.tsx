"use client";

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

  const rangeText =
    total > 0
      ? `${page > 1 ? (page - 1) * limit + 1 : 1}–${end} of ${total}`
      : "";

  const prevDisabled = loading || page <= 1;
  const nextDisabled = loading || page >= totalPages;

  const buttonClass =
    "px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";

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
      <div className="flex items-center gap-4">
        {total > 0 && <span className="text-sm text-gray-800">{rangeText}</span>}
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
    <div className="mb-4 space-y-3">
      {limitRow}
      {prevNextRow}
    </div>
  );
}
