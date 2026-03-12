"use client";

import { useEffect, useState } from "react";

type TriggerAction =
  | "check-alerts"
  | "send-pending"
  | "daily-summary"
  | "check-compliance";

const DAYS = 30;

interface StatsOverview {
  totalCities: number;
  totalBuildings: number;
  activeBuildings: number;
  pausedBuildings: number;
  totalMessages: number;
  totalAlerts: number;
  failedMessages: number;
  overallComplianceRate: number | null;
  days: number;
}

interface CityStat {
  cityId: string;
  cityName: string;
  buildingCount: number;
  activeBuildingCount: number;
  totalAlerts: number;
  temperatureTrend?: Array<{ at: string; tempF: number }>;
}

interface ComplianceItem {
  buildingId: string;
  buildingName: string;
  complianceRate: number | null;
}

interface MessageItem {
  id: string;
  messageType: string;
  sentAt: string;
  delivered: boolean;
  deliveryStatus: string;
  buildingName: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  const [cityStats, setCityStats] = useState<CityStat[] | null>(null);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState("");

  const [recentAlerts, setRecentAlerts] = useState<
    Array<{
      id: string;
      cityName: string;
      alertType: string;
      triggeredAt: string;
      processed: boolean;
    }>
  >([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState("");
  const [alertsPage, setAlertsPage] = useState(1);
  const [alertsLimit, setAlertsLimit] = useState(10);
  const [alertsTotal, setAlertsTotal] = useState(0);
  const [alertsTotalPages, setAlertsTotalPages] = useState(0);

  const [buildingCompliance, setBuildingCompliance] = useState<
    ComplianceItem[]
  >([]);
  const [complianceLoading, setComplianceLoading] = useState(true);
  const [complianceError, setComplianceError] = useState("");

  const [recentMessages, setRecentMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState("");

  const [triggerLoading, setTriggerLoading] = useState<TriggerAction | null>(
    null,
  );
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setStatsError("Not authenticated");
      setStatsLoading(false);
      setCitiesLoading(false);
      setAlertsLoading(false);
      setComplianceLoading(false);
      setMessagesLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    (async () => {
      try {
        const r1 = await fetch(`/api/admin/dashboard/stats?days=${DAYS}`, {
          headers,
        });
        const d1 = await r1.json().catch(() => ({}));
        if (!r1.ok) throw new Error(d1.message || "Stats failed");
        setStats(d1.overview);
      } catch (e: any) {
        setStatsError(e.message || "Failed");
      } finally {
        setStatsLoading(false);
      }

      try {
        const r2 = await fetch(`/api/admin/dashboard/cities?days=${DAYS}`, {
          headers,
        });
        const d2 = await r2.json().catch(() => ({}));
        if (!r2.ok) throw new Error(d2.message || "Cities failed");
        setCityStats(d2.cityStats ?? []);
      } catch (e: any) {
        setCitiesError(e.message || "Failed");
      } finally {
        setCitiesLoading(false);
      }

      try {
        const r3 = await fetch(`/api/admin/dashboard/alerts?page=1&limit=10`, {
          headers,
        });
        const d3 = await r3.json().catch(() => ({}));
        if (!r3.ok) throw new Error(d3.message || "Alerts failed");
        setRecentAlerts(d3.recentAlerts ?? []);
        setAlertsTotal(d3.total ?? 0);
        setAlertsTotalPages(d3.totalPages ?? 1);
        setAlertsPage(1);
        setAlertsLimit(10);
      } catch (e: any) {
        setAlertsError(e.message || "Failed");
      } finally {
        setAlertsLoading(false);
      }

      try {
        const r4 = await fetch(`/api/admin/compliance?days=${DAYS}`, {
          headers,
        });
        const d4 = await r4.json().catch(() => ({}));
        if (!r4.ok) throw new Error(d4.message || "Compliance failed");
        setBuildingCompliance(d4.buildings ?? []);
      } catch (e: any) {
        setComplianceError(e.message || "Failed");
      } finally {
        setComplianceLoading(false);
      }

      try {
        const r5 = await fetch(
          `/api/admin/dashboard/messages?days=${DAYS}&limit=10`,
          { headers },
        );
        const d5 = await r5.json().catch(() => ({}));
        if (!r5.ok) throw new Error(d5.message || "Messages failed");
        setRecentMessages(d5.recentMessages ?? []);
      } catch (e: any) {
        setMessagesError(e.message || "Failed");
      } finally {
        setMessagesLoading(false);
      }
    })();
  }, []);

  const fetchAlertsPage = async (page: number, limit: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setAlertsLoading(true);
    setAlertsError("");
    try {
      const r = await fetch(
        `/api/admin/dashboard/alerts?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Alerts failed");
      setRecentAlerts(d.recentAlerts ?? []);
      setAlertsTotal(d.total ?? 0);
      setAlertsTotalPages(d.totalPages ?? 1);
      setAlertsPage(d.page ?? page);
      setAlertsLimit(d.limit ?? limit);
    } catch (e: any) {
      setAlertsError(e.message || "Failed");
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleTrigger = async (action: TriggerAction) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setTriggerLoading(action);
    setTriggerResult(null);
    try {
      const res = await fetch("/api/admin/trigger", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = json.error
          ? `${json.message}: ${json.error}`
          : json.message || "Request failed";
        setTriggerResult(`Error: ${detail}`);
      } else {
        setTriggerResult(JSON.stringify(json, null, 2));
      }
    } catch (err: any) {
      setTriggerResult(`Error: ${err.message}`);
    } finally {
      setTriggerLoading(null);
    }
  };

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-800">Loading…</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (statsError && !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{statsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-800">
          {stats
            ? `Overview of system activity and performance (last ${stats.days} days)`
            : "Loading…"}
        </p>
      </div>

      {/* Section 1: Overview Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white overflow-hidden shadow rounded-lg p-5 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))
        ) : statsError ? (
          <div className="col-span-full rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Stats: {statsError}
            </p>
          </div>
        ) : stats ? (
          <>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="shrink-0 bg-blue-500 rounded-md p-3">
                    <span className="text-2xl">🏙️</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-800 truncate">
                        Total Cities
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalCities}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="shrink-0 bg-green-500 rounded-md p-3">
                    <span className="text-2xl">🏢</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-800 truncate">
                        Active Buildings
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.activeBuildings} / {stats.totalBuildings}
                        {stats.pausedBuildings > 0 && (
                          <span className="text-yellow-600 text-sm">
                            {" "}
                            ({stats.pausedBuildings} paused)
                          </span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="shrink-0 bg-yellow-500 rounded-md p-3">
                    <span className="text-2xl">📋</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-800 truncate">
                        Alert Logs
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalAlerts}
                      </dd>
                      <dd className="text-xs text-gray-800">
                        {stats.totalMessages} msgs · {stats.failedMessages}{" "}
                        failed
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="shrink-0 bg-purple-500 rounded-md p-3">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-800 truncate">
                        Compliance Rate
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.overallComplianceRate != null
                          ? `${stats.overallComplianceRate.toFixed(1)}%`
                          : "N/A"}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Message Triggers */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Message Triggers
        </h2>
        <p className="text-sm text-gray-800 mb-4">
          Run cron actions manually for testing.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleTrigger("daily-summary")}
            disabled={!!triggerLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {triggerLoading === "daily-summary"
              ? "Running…"
              : "1. Daily Summary"}
          </button>
          <button
            onClick={() => handleTrigger("check-alerts")}
            disabled={!!triggerLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {triggerLoading === "check-alerts" ? "Running…" : "2. Check Alerts"}
          </button>
          <button
            onClick={() => handleTrigger("send-pending")}
            disabled={!!triggerLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {triggerLoading === "send-pending" ? "Sending…" : "3. Send Pending"}
          </button>
          <button
            onClick={() => handleTrigger("check-compliance")}
            disabled={!!triggerLoading}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
          >
            {triggerLoading === "check-compliance"
              ? "Running…"
              : "4. Check Compliance"}
          </button>
        </div>
        {triggerResult && (
          <pre className="mt-4 p-4 bg-gray-200 rounded-md border border-gray-300 text-gray-900 text-sm overflow-auto max-h-48 font-mono">
            {triggerResult}
          </pre>
        )}
      </div>

      {/* Section 2: City Stats & Temperature Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              City Statistics
            </h2>
            {citiesLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-4 bg-gray-200 rounded w-4/6" />
              </div>
            ) : citiesError ? (
              <p className="text-sm text-red-600">Cities: {citiesError}</p>
            ) : cityStats && cityStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        City
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Buildings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Active
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Alerts
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cityStats.map((city) => (
                      <tr key={city.cityId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {city.cityName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {city.buildingCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {city.activeBuildingCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {city.totalAlerts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-800">No cities.</p>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              City Temperature Trends (7 days)
            </h2>
            {citiesLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            ) : citiesError ? (
              <p className="text-sm text-red-600">Trends: {citiesError}</p>
            ) : cityStats &&
              cityStats.filter(
                (c) => c.temperatureTrend && c.temperatureTrend.length > 0,
              ).length > 0 ? (
              <div className="space-y-4">
                {cityStats
                  .filter(
                    (c) => c.temperatureTrend && c.temperatureTrend.length > 0,
                  )
                  .map((city) => {
                    const pts = city.temperatureTrend!;
                    const last = pts[pts.length - 1];
                    const first = pts[0];
                    const change = first ? last.tempF - first.tempF : 0;
                    return (
                      <div
                        key={city.cityId}
                        className="p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-900">
                            {city.cityName}
                          </span>
                          <span className="text-gray-800">
                            {last.tempF.toFixed(1)}°F{" "}
                            {change !== 0 && (change > 0 ? "↑" : "↓")}{" "}
                            {Math.abs(change).toFixed(1)}°F
                          </span>
                        </div>
                        <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(10, 50 + (last.tempF - 50)))}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-gray-800">
                No temperature data in last 7 days.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Recent Alerts */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Recent Alert Logs
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-800">
                Show
                <select
                  value={alertsLimit}
                  onChange={(e) => fetchAlertsPage(1, Number(e.target.value))}
                  className="mx-1.5 rounded border-gray-300 text-sm py-0.5"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                per page
              </span>
              {alertsTotal > 0 && (
                <span className="text-sm text-gray-800">
                  {alertsPage > 1 ? (alertsPage - 1) * alertsLimit + 1 : 1}–
                  {Math.min(alertsPage * alertsLimit, alertsTotal)} of{" "}
                  {alertsTotal}
                </span>
              )}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => fetchAlertsPage(alertsPage - 1, alertsLimit)}
                  disabled={alertsLoading || alertsPage <= 1}
                  className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => fetchAlertsPage(alertsPage + 1, alertsLimit)}
                  disabled={alertsLoading || alertsPage >= alertsTotalPages}
                  className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          {alertsLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-12 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          ) : alertsError ? (
            <p className="text-sm text-red-600">Alerts: {alertsError}</p>
          ) : recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {alert.cityName}
                    </p>
                    <p className="text-xs text-gray-800">
                      {alert.alertType.replace("_", " ")}
                    </p>
                  </div>
                  <div className="text-xs text-gray-800">
                    {new Date(alert.triggeredAt).toLocaleString()}
                    {alert.processed && (
                      <span className="ml-2 text-green-600">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-800">No alerts in period.</p>
          )}
        </div>
      </div>

      {/* Section 4: Compliance per building */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Compliance per building
          </h2>
          {complianceLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-10 bg-gray-200 rounded w-full" />
              <div className="h-10 bg-gray-200 rounded w-5/6" />
              <div className="h-10 bg-gray-200 rounded w-4/6" />
            </div>
          ) : complianceError ? (
            <p className="text-sm text-red-600">
              Compliance: {complianceError}
            </p>
          ) : buildingCompliance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Building
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Compliance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {buildingCompliance.map((b) => (
                    <tr key={b.buildingId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {b.buildingName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {b.complianceRate != null
                          ? `${b.complianceRate.toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-800">No compliance data.</p>
          )}
        </div>
      </div>

      {/* Section 5: Message history & upload status */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Message history & upload status
          </h2>
          {messagesLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-10 bg-gray-200 rounded w-full" />
              <div className="h-10 bg-gray-200 rounded w-full" />
              <div className="h-10 bg-gray-200 rounded w-4/6" />
            </div>
          ) : messagesError ? (
            <p className="text-sm text-red-600">Messages: {messagesError}</p>
          ) : recentMessages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Building
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Delivered
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentMessages.map((m) => (
                    <tr key={m.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {m.messageType.replace("_", " ")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {m.buildingName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(m.sentAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${m.delivered ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {m.delivered ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-800">No messages yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
