"use client";

import { ReactNode, useEffect, useState } from "react";
import { PaginationBar } from "@/components/PaginationBar";

interface Building {
  id: string;
  name: string;
  cityName: string;
}

interface EnergyReport {
  id?: string;
  month: number;
  year: number;
  savingsPercentage: number;
  savingsKBTU: number;
  pdfUrl: string;
}

interface DashboardData {
  building: {
    id: string;
    name: string;
    address: string;
    isActive: boolean;
    isPaused: boolean;
    cityId: string;
  };
  stats: {
    complianceRate: number | null;
    totalAlerts: number;
    totalRecipients: number;
    days: number;
  };
  messages: Array<{
    id: string;
    messageType: string;
    sentAt: string;
    delivered: boolean;
    deliveryStatus: string;
    hasUpload: boolean;
    lastUpload: string | null;
  }>;
  recentUploads: Array<{
    id: string;
    fileName: string;
    fileUrl?: string;
    uploadedAt: string;
    isCompliant: boolean;
    messageType: string;
    sentAt: string;
  }>;
  latestEnergyReport: EnergyReport | null;
  energyReports?: EnergyReport[];
}
function StatCard({
  title,
  value,
  color,
  icon,
}: {
  title: string;
  value: ReactNode;
  color: "green" | "blue";
  icon: ReactNode;
}) {
  const colors = {
    green: "bg-green-600",
    blue: "bg-blue-600",
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white ${colors[color]}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-xs font-medium tracking-wide text-gray-500">
          {title}
        </p>

        <p className="text-lg font-semibold leading-none text-gray-900 mt-1">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function BuildingDashboard() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buildingsLoaded, setBuildingsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesLimit, setMessagesLimit] = useState(10);
  const [msgSortKey, setMsgSortKey] = useState<"sentAt" | "messageType" | "deliveryStatus">("sentAt");
  const [msgSortDir, setMsgSortDir] = useState<"asc" | "desc">("desc");
  const [viewingUploadId, setViewingUploadId] = useState<string | null>(null);

  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [addBuildingForm, setAddBuildingForm] = useState({
    buildingName: "",
    buildingAddress: "",
  });
  const [addBuildingLoading, setAddBuildingLoading] = useState(false);
  const [addBuildingError, setAddBuildingError] = useState("");
  const [addBuildingSuccess, setAddBuildingSuccess] = useState("");

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBuildingError("");
    if (!data?.building?.cityId) {
      setAddBuildingError("No city selected for current building");
      return;
    }
    setAddBuildingLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const cityId = data.building.cityId;
      const res = await fetch("/api/building/add-building", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          buildingName: addBuildingForm.buildingName.trim(),
          buildingAddress: addBuildingForm.buildingAddress.trim(),
          cityId,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to add building");
      if (result.token) localStorage.setItem("token", result.token);
      setAddBuildingSuccess(result.message || "Building added successfully!");
      setAddBuildingForm({ buildingName: "", buildingAddress: "" });
      setTimeout(() => {
        setShowAddBuilding(false);
        setAddBuildingSuccess("");
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setAddBuildingError(err.message);
    } finally {
      setAddBuildingLoading(false);
    }
  };

  const openUpload = async (uploadId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setViewingUploadId(uploadId);
    const tab = window.open("", "_blank");
    try {
      const res = await fetch(`/api/photo-uploads/${uploadId}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string }).message || "Could not open file",
        );
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (tab) {
        tab.location.href = objectUrl;
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (e: unknown) {
      tab?.close();
      alert(e instanceof Error ? e.message : "Could not open file");
    } finally {
      setViewingUploadId(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/buildings", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch buildings");
        return res.json();
      })
      .then((list: Building[]) => {
        setBuildings(list);
        if (list.length > 0 && !selectedBuildingId) setSelectedBuildingId(list[0].id);
        if (list.length === 0) {
          setError("No building associated with your account");
          setLoading(false);
        }
        setBuildingsLoaded(true);
      })
      .catch((e: any) => {
        setError(e.message || "No buildings");
        setLoading(false);
        setBuildingsLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!selectedBuildingId) {
      if (buildingsLoaded) setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setMessagesPage(1);
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`/api/buildings/${selectedBuildingId}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch building data");
        return res.json();
      })
      .then(setData)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedBuildingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        {buildings.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Building:</span>
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name} – {b.cityName}</option>
              ))}
            </select>
          </div>
        )}
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">
            {error || "Building data not available"}
          </h3>
        </div>
      </div>
    );
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const energyReports =
    data.energyReports ??
    (data.latestEnergyReport ? [data.latestEnergyReport] : []);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {/* Row 1: Name + Address (left) | Add Building button (right) */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {data.building.name}
            </h1>
            <p className="mt-1 text-gray-500">{data.building.address}</p>
            {data.building.isPaused && (
              <div className="mt-2 inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                Building is currently paused
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setAddBuildingError("");
              setAddBuildingSuccess("");
              setAddBuildingForm({ buildingName: "", buildingAddress: "" });
              setShowAddBuilding(true);
            }}
            className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white shadow hover:bg-blue-700 shrink-0"
          >
            + Add Building
          </button>
        </div>

        {/* Row 2: Stats (left) | Building Filter (right) */}
        <div className="mt-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex flex-wrap gap-4">
            <StatCard
              title="Compliance Rate"
              value={
                data.stats.complianceRate != null
                  ? `${data.stats.complianceRate}%`
                  : "N/A"
              }
              color="green"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />

            <StatCard
              title="Total Alerts"
              value={data.stats.totalAlerts}
              color="blue"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              }
            />
          </div>

          {buildings.length > 1 && (
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Building:</span>
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.cityName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {energyReports.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Energy Reports</h2>
            <div className="space-y-3">
              {energyReports.map((report, idx) => (
                <div key={report.id ?? idx} className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="shrink-0 w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center p-1">
                      <span className="text-sm font-bold text-emerald-700 leading-tight text-center">
                        {report.savingsPercentage >= 0 ? "+" : ""}
                        {report.savingsPercentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {monthNames[report.month - 1]} {report.year}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {report.savingsKBTU > 0 ? "+" : ""}
                        {report.savingsKBTU.toLocaleString()} kBTU
                      </p>
                    </div>
                  </div>
                  {(report.pdfUrl || report.id) && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!report.id) {
                            if (report.pdfUrl) window.open(report.pdfUrl, "_blank");
                            return;
                          }
                          const token = localStorage.getItem("token");
                          if (!token) return;
                          const tr = await fetch(`/api/reports/${report.id}/pdf-token`, {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (!tr.ok) return;
                          const { token: linkToken } = await tr.json();
                          if (!linkToken) return;
                          const url = `${window.location.origin}/api/reports/${report.id}/pdf?t=${linkToken}`;
                          window.open(url, "_blank");
                        }}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer"
                      >
                        View
                      </button>
                      {report.id && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!report.id) return;
                            try {
                              const token = localStorage.getItem("token");
                              if (!token) return;
                              const tr = await fetch(`/api/reports/${report.id}/pdf-token`, {
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (!tr.ok) return;
                              const { token: linkToken } = await tr.json();
                              if (!linkToken) return;
                              const url = `${window.location.origin}/api/reports/${report.id}/pdf?t=${linkToken}`;
                              if (navigator.clipboard?.writeText) {
                                await navigator.clipboard.writeText(url);
                              } else {
                                const ta = document.createElement("textarea");
                                ta.value = url;
                                ta.style.position = "fixed";
                                ta.style.opacity = "0";
                                document.body.appendChild(ta);
                                ta.select();
                                document.execCommand("copy");
                                document.body.removeChild(ta);
                              }
                              setLinkCopied(true);
                              setTimeout(() => setLinkCopied(false), 2500);
                            } catch {
                              // copy failed
                            }
                          }}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 cursor-pointer"
                        >
                          {linkCopied ? "Copied" : "Copy link"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Messages */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Recent Messages
          </h2>
          {(() => {
            const sortedMessages = [...data.messages].sort((a, b) => {
              let cmp = 0;
              if (msgSortKey === "sentAt")
                cmp =
                  new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
              else if (msgSortKey === "messageType")
                cmp = a.messageType.localeCompare(b.messageType);
              else if (msgSortKey === "deliveryStatus")
                cmp = (a.deliveryStatus || "").localeCompare(
                  b.deliveryStatus || "",
                );
              return msgSortDir === "asc" ? cmp : -cmp;
            });
            const messagesTotal = sortedMessages.length;
            const showMessagesPagination = messagesTotal > messagesLimit;
            const totalPages = Math.max(
              1,
              Math.ceil(messagesTotal / messagesLimit),
            );
            const safePage = Math.min(messagesPage, totalPages);
            const paginatedMessages = sortedMessages.slice(
              (safePage - 1) * messagesLimit,
              safePage * messagesLimit,
            );
            const toggleSort = (key: typeof msgSortKey) => {
              if (msgSortKey === key)
                setMsgSortDir((d) => (d === "asc" ? "desc" : "asc"));
              else {
                setMsgSortKey(key);
                setMsgSortDir("asc");
              }
              setMessagesPage(1);
            };
            const SortIcon = ({ col }: { col: typeof msgSortKey }) =>
              msgSortKey === col ? (
                <span className="ml-1">{msgSortDir === "asc" ? "↑" : "↓"}</span>
              ) : (
                <span className="ml-1 text-gray-300">↕</span>
              );
            return (
              <>
                {showMessagesPagination && (
                  <PaginationBar
                    page={safePage}
                    limit={messagesLimit}
                    total={messagesTotal}
                    onPageChange={setMessagesPage}
                    onLimitChange={(l) => {
                      setMessagesLimit(l);
                      setMessagesPage(1);
                    }}
                    variant="compact"
                    itemLabel="messages"
                    part="top"
                  />
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          onClick={() => toggleSort("messageType")}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider select-none"
                        >
                          Type
                          <SortIcon col="messageType" />
                        </th>
                        <th
                          onClick={() => toggleSort("sentAt")}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider select-none"
                        >
                          Sent At
                          <SortIcon col="sentAt" />
                        </th>
                        <th
                          onClick={() => toggleSort("deliveryStatus")}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider select-none"
                        >
                          Status
                          <SortIcon col="deliveryStatus" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Upload
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedMessages.map((message) => (
                        <tr key={message.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {message.messageType.replace("_", " ")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {new Date(message.sentAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                message.delivered
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {message.deliveryStatus ||
                                (message.delivered ? "Delivered" : "Failed")}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {message.hasUpload ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                ✓ Uploaded
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {showMessagesPagination && (
                  <PaginationBar
                    page={safePage}
                    limit={messagesLimit}
                    total={messagesTotal}
                    onPageChange={setMessagesPage}
                    onLimitChange={(l) => {
                      setMessagesLimit(l);
                      setMessagesPage(1);
                    }}
                    variant="compact"
                    itemLabel="messages"
                    part="bottom"
                  />
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Recent Uploads — below Messages */}
      {data.recentUploads.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Recent Uploads
            </h2>
            <div className="space-y-3">
              {data.recentUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {upload.fileName}
                    </p>
                    <p className="text-xs text-gray-800">
                      {new Date(upload.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        upload.isCompliant
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {upload.isCompliant ? "Compliant" : "Late"}
                    </span>
                    <button
                      type="button"
                      onClick={() => openUpload(upload.id)}
                      disabled={viewingUploadId === upload.id}
                      className="inline-flex items-center px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 cursor-pointer disabled:opacity-50"
                    >
                      {viewingUploadId === upload.id ? "Opening…" : "View"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Building Modal */}
      {showAddBuilding && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 transition-opacity"
              onClick={() => setShowAddBuilding(false)}
              aria-hidden="true"
            />
            <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Add Building
                </h3>
                <button
                  onClick={() => setShowAddBuilding(false)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {addBuildingSuccess ? (
                <div className="rounded-md bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    {addBuildingSuccess}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAddBuilding} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800">
                      Building name
                    </label>
                    <input
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="My Building"
                      value={addBuildingForm.buildingName}
                      onChange={(e) =>
                        setAddBuildingForm({
                          ...addBuildingForm,
                          buildingName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800">
                      Building address
                    </label>
                    <input
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="123 Main St"
                      value={addBuildingForm.buildingAddress}
                      onChange={(e) =>
                        setAddBuildingForm({
                          ...addBuildingForm,
                          buildingAddress: e.target.value,
                        })
                      }
                    />
                  </div>

                  {addBuildingError && (
                    <div className="rounded-md bg-red-50 p-3">
                      <p className="text-sm font-medium text-red-800">
                        {addBuildingError}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddBuilding(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addBuildingLoading}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {addBuildingLoading ? "Adding..." : "Add Building"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View-Only Notice — footer */}
      <div className="pt-4 mt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          View-only access. This portal provides read-only access to your
          building&apos;s data. To make changes, please contact your
          administrator.
        </p>
      </div>
    </div>
  );
}
