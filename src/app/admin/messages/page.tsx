"use client";

import { useEffect, useState } from "react";
import { MessageHistoryTable, type MessageHistoryRow } from "@/components/MessageHistoryTable";

export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [buildings, setBuildings] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);

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
        <div className="flex items-center gap-2">
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
    </div>
  );
}
