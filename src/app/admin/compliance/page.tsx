"use client";

import { useEffect, useState } from "react";
import { MessageHistoryTable, type MessageHistoryRow } from "@/components/MessageHistoryTable";

interface ComplianceData {
  overallComplianceRate: number | null;
  buildings: Array<{
    buildingId: string;
    buildingName: string;
    complianceRate: number | null;
  }>;
  days: number;
}

interface BuildingMessages {
  buildingId: string;
  complianceRate: number | null;
  days: number;
  messages: MessageHistoryRow[];
  total: number;
  page: number;
  limit: number;
}

export default function CompliancePage() {
  const [overview, setOverview] = useState<ComplianceData | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [buildingData, setBuildingData] = useState<BuildingMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [error, setError] = useState("");
  const days = 30;
  const [msgPage, setMsgPage] = useState(1);
  const [msgLimit, setMsgLimit] = useState(10);

  useEffect(() => {
    fetchOverview();
  }, [days]);

  useEffect(() => {
    if (!overview?.buildings?.length) return;
    const ids = overview.buildings.map((b) => b.buildingId);
    if (!selectedBuilding || !ids.includes(selectedBuilding)) {
      setSelectedBuilding(overview.buildings[0].buildingId);
    }
  }, [overview]);

  useEffect(() => {
    if (!selectedBuilding) {
      setBuildingData(null);
      return;
    }
    setMsgPage(1);
    setBuildingData(null);
    fetchBuildingData(1, msgLimit);
  }, [selectedBuilding, days]);

  useEffect(() => {
    if (!selectedBuilding) return;
    if (msgPage === 1 && buildingData === null) return;
    fetchBuildingData();
  }, [msgPage, msgLimit]);

  const fetchOverview = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/admin/compliance?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch compliance data");

      const data = await response.json();
      setOverview(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildingData = async (pageOverride?: number, limitOverride?: number) => {
    const page = pageOverride ?? msgPage;
    const limit = limitOverride ?? msgLimit;
    try {
      setBuildingLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `/api/admin/compliance?buildingId=${selectedBuilding}&days=${days}&page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch building data");

      const data = await response.json();
      setBuildingData({
        buildingId: data.buildingId,
        complianceRate: data.complianceRate,
        days: data.days,
        messages: data.messages ?? [],
        total: data.total ?? 0,
        page: data.page ?? page,
        limit: data.limit ?? limit,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBuildingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
        <p className="mt-1 text-sm text-gray-800">
          Track photo upload compliance across buildings
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      {overview && (
        <>
          {/* Compliance colors: 0 or null = gray (neutral); 1–49% = red; 50–79% = yellow/amber; 80%+ = green */}
          {/* Summary row: Overall + Building cards */}
          <div className="grid gap-4 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
            {/* Overall: circular progress */}
            <div
              className="bg-white shadow rounded-lg p-4 flex flex-col items-center justify-center"
              title="Share of all messages (alert + daily summary) with an upload within 2 hours."
            >
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                Overall
              </p>
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                  />
                  <path
                    className={
                      overview.overallComplianceRate == null ||
                      (overview.overallComplianceRate ?? 0) === 0
                        ? "text-gray-400"
                        : (overview.overallComplianceRate ?? 0) >= 80
                        ? "text-green-600"
                        : (overview.overallComplianceRate ?? 0) >= 50
                        ? "text-amber-500"
                        : "text-red-500"
                    }
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${((overview.overallComplianceRate ?? 0) / 100) * 97.34} 97.34`}
                    d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                  />
                </svg>
                <span className="absolute text-lg font-bold text-gray-900 tabular-nums">
                  {overview.overallComplianceRate != null
                    ? `${overview.overallComplianceRate.toFixed(0)}%`
                    : "—"}
                </span>
              </div>
            </div>

            {/* Building cards: horizontal scroll for many buildings */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Compliance per building
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Photo upload compliance · last {days} days
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {overview.buildings.map((building) => (
                    <button
                      key={building.buildingId}
                      type="button"
                      className={`w-full p-3 rounded-lg border-2 cursor-pointer transition-colors text-left min-w-0 ${
                          selectedBuilding === building.buildingId
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedBuilding(building.buildingId)}
                      >
                        <p
                          className="text-sm font-medium text-gray-900 truncate mb-2"
                          title={building.buildingName}
                        >
                          {building.buildingName}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                building.complianceRate == null ||
                                building.complianceRate === 0
                                  ? "bg-gray-400"
                                  : building.complianceRate >= 80
                                  ? "bg-green-600"
                                  : building.complianceRate >= 50
                                  ? "bg-yellow-600"
                                  : "bg-red-600"
                              }`}
                              style={{
                                width:
                                  building.complianceRate != null
                                    ? `${Math.min(building.complianceRate, 100)}%`
                                    : "0%",
                              }}
                            />
                          </div>
                          <span
                            className={`text-sm font-bold shrink-0 ${
                              building.complianceRate == null ||
                              (building.complianceRate ?? 0) === 0
                                ? "text-gray-600"
                                : (building.complianceRate ?? 0) >= 80
                                ? "text-green-700"
                                : (building.complianceRate ?? 0) >= 50
                                ? "text-yellow-700"
                                : "text-red-700"
                            }`}
                          >
                            {building.complianceRate != null
                              ? `${building.complianceRate.toFixed(1)}%`
                              : "N/A"}
                          </span>
                        </div>
                      </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Building Details */}
          {(buildingData || buildingLoading) && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Message History
                </h2>
                {buildingLoading && !buildingData ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : buildingData ? (
                  <MessageHistoryTable
                    messages={buildingData.messages}
                    variant="building"
                    emptyMessage="No messages for this building in the selected period."
                    pagination={
                      buildingData.total > 0
                        ? {
                            page: buildingData.page,
                            limit: buildingData.limit,
                            total: buildingData.total,
                            onPageChange: setMsgPage,
                            onLimitChange: (l) => {
                              setMsgLimit(l);
                              setMsgPage(1);
                            },
                            itemLabel: "results",
                          }
                        : undefined
                    }
                  />
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
