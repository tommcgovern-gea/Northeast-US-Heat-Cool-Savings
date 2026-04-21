"use client";

import { useEffect, useState } from "react";
import { MessageHistoryTable, type MessageHistoryRow } from "@/components/MessageHistoryTable";
import { Toast } from "@/components/Toast";

export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [buildings, setBuildings] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [retrying, setRetrying] = useState(false);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    fetchMessages(page, limit);
  }, [selectedBuilding, page, limit]);

  const fetchBuildings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/buildings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch buildings");

      const data = await response.json();
      setBuildings(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchMessages = async (nextPage: number = page, nextLimit: number = limit) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      let url = `/api/admin/messages?limit=${nextLimit}&offset=${(nextPage - 1) * nextLimit}`;
      if (selectedBuilding) {
        url += `&buildingId=${selectedBuilding}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch messages");

      const data = await response.json();
      setMessages(data.messages || []);
      setTotal(data.total || 0);
      setPage(nextPage);
      setLimit(nextLimit);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      setRetrying(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/admin/trigger", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "send-pending" }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to retry pending messages");
      }

      setToast({
        type: "success",
        message: "Retry started for pending/failed messages.",
      });
      await fetchMessages(1, limit);
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.message || "Failed to retry pending messages",
      });
    } finally {
      setRetrying(false);
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    try {
      setRetryingMessageId(messageId);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/admin/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to retry message");
      }

      setToast({
        type: data.success ? "success" : "error",
        message: data.message || (data.success ? "Message retried." : "Message retry failed."),
      });
      await fetchMessages(page, limit);
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.message || "Failed to retry message",
      });
    } finally {
      setRetryingMessageId(null);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Message Logs</h1>
          <p className="mt-1 text-sm text-gray-800">
            View all sent messages and delivery status
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRetryFailed}
            disabled={retrying}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {retrying ? "Retrying..." : "Retry Failed"}
          </button>
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Filter by Building:
          </label>
          <select
            value={selectedBuilding}
            onChange={(e) => {
              setSelectedBuilding(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
          >
            <option value="">All Buildings</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 sm:px-6">
          <MessageHistoryTable
            messages={messages}
            variant="full"
            loading={loading}
            onRetryMessage={handleRetryMessage}
            retryingMessageId={retryingMessageId}
            pagination={{
              page,
              limit,
              total,
              onPageChange: setPage,
              onLimitChange: (l) => {
                setLimit(l);
                setPage(1);
              },
              itemLabel: "results",
            }}
          />
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
