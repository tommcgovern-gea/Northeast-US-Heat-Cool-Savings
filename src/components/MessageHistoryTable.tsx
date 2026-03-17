"use client";

import { PaginationBar } from "@/components/PaginationBar";

/** Shared shape for message rows from admin messages, dashboard messages, or compliance APIs. */
export interface MessageHistoryRow {
  id: string;
  messageType: string;
  sentAt: string;
  delivered: boolean;
  deliveryStatus?: string;
  hasUpload?: boolean;
  buildingName?: string;
  recipientName?: string;
  email?: string;
  phone?: string;
  channel?: string;
}

export type MessageHistoryVariant = "full" | "compact" | "building";

export interface MessageHistoryTableProps {
  messages: MessageHistoryRow[];
  variant: MessageHistoryVariant;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  /** When set, shows PaginationBar above the table. */
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
    itemLabel?: string;
  };
  /** Optional class for scrollable wrapper (e.g. max-h-[28rem] overflow-y-auto) to fix height. */
  scrollClassName?: string;
}

function DeliveryBadge({ delivered, deliveryStatus }: { delivered: boolean; deliveryStatus?: string }) {
  const label = deliveryStatus || (delivered ? "Delivered" : "Failed");
  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        delivered ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {label}
    </span>
  );
}

function UploadCell({ hasUpload }: { hasUpload?: boolean }) {
  if (hasUpload) {
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        ✓ Uploaded
      </span>
    );
  }
  return (
    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
      Pending
    </span>
  );
}

export function MessageHistoryTable({
  messages,
  variant,
  loading = false,
  error,
  emptyMessage = "No messages yet.",
  pagination,
  scrollClassName,
}: MessageHistoryTableProps) {
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const showTable = !loading && messages.length > 0;
  const showPagination = pagination && (pagination.total > 0 || loading);
  const paginationTop =
    showPagination && pagination.onLimitChange ? (
      <PaginationBar
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        onPageChange={pagination.onPageChange}
        onLimitChange={pagination.onLimitChange}
        loading={loading}
        variant="compact"
        itemLabel={pagination.itemLabel ?? "results"}
        part="top"
      />
    ) : null;
  const paginationBottom = showPagination ? (
    <PaginationBar
      page={pagination.page}
      limit={pagination.limit}
      total={pagination.total}
      onPageChange={pagination.onPageChange}
      onLimitChange={pagination.onLimitChange}
      loading={loading}
      variant="compact"
      itemLabel={pagination.itemLabel ?? "results"}
      part="bottom"
    />
  ) : null;

  const content = loading ? (
    <div className="animate-pulse space-y-2">
      <div className="h-10 bg-gray-200 rounded w-full" />
      <div className="h-10 bg-gray-200 rounded w-full" />
      <div className="h-10 bg-gray-200 rounded w-4/6" />
    </div>
  ) : showTable ? (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                {variant !== "building" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Building
                  </th>
                )}
                {variant === "full" && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Channel
                    </th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {variant === "compact" ? "Sent" : "Sent At"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {variant === "compact"
                    ? "Delivered"
                    : variant === "building"
                    ? "Delivery"
                    : "Status"}
                </th>
                {(variant === "full" || variant === "building") && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Upload
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {messages.map((m) => (
                <tr key={m.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {m.messageType.replace("_", " ")}
                  </td>
                  {variant !== "building" && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {m.buildingName ?? "—"}
                    </td>
                  )}
                  {variant === "full" && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        <div>{m.recipientName ?? "—"}</div>
                        <div className="text-xs text-gray-600">
                          {m.email || m.phone || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {m.channel ? m.channel.toUpperCase() : "—"}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(m.sentAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {variant === "compact" ? (
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          m.delivered ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {m.delivered ? "Yes" : "No"}
                      </span>
                    ) : (
                      <DeliveryBadge delivered={m.delivered} deliveryStatus={m.deliveryStatus} />
                    )}
                  </td>
                  {(variant === "full" || variant === "building") && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {variant === "full" ? (
                        m.hasUpload ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            -
                          </span>
                        )
                      ) : (
                        <UploadCell hasUpload={m.hasUpload} />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
      </table>
    </div>
  ) : (
        <p className="text-sm text-gray-800">{emptyMessage}</p>
      );

  return (
    <>
      {paginationTop}
      {scrollClassName ? (
        <div className={scrollClassName}>{content}</div>
      ) : (
        content
      )}
      {paginationBottom}
    </>
  );
}
