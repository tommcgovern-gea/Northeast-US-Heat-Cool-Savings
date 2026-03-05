"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TriggerAction = "check-alerts" | "send-pending" | "daily-summary" | "check-compliance";

interface DashboardData {
  overview: {
    totalCities: number;
    totalBuildings: number;
    activeBuildings: number;
    pausedBuildings: number;
    totalMessages: number;
    totalAlerts: number;
    failedMessages: number;
    overallComplianceRate: number | null;
    days: number;
  };
  cityStats: Array<{
    cityId: string;
    cityName: string;
    buildingCount: number;
    activeBuildingCount: number;
    totalAlerts: number;
  }>;
  buildingCompliance: Array<{
    buildingId: string;
    buildingName: string;
    complianceRate: number | null;
  }>;
  recentAlerts: Array<{
    id: string;
    cityName: string;
    alertType: string;
    triggeredAt: string;
    processed: boolean;
  }>;
  energyReports: Array<{
    id: string;
    buildingName: string;
    month: number;
    year: number;
    savingsPercentage: number;
    savingsKBTU: number;
    pdfUrl: string;
    generatedAt: string;
  }>;
  energySavings: {
    totalSavingsKBTU: number;
    avgSavingsPercentage: number;
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [triggerLoading, setTriggerLoading] = useState<TriggerAction | null>(null);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/admin/dashboard?days=30", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = json.error ? `${json.message}: ${json.error}` : (json.message || "Request failed");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">{error}</h3>
      </div>
    );
  }

  if (!data) return null;

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview and message triggers</p>
      </div>

      {/* Message Triggers - Simple UI to run cron actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Message Triggers</h2>
        <p className="text-sm text-gray-500 mb-4">Run these to test SMS/Email flow. No curl needed.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleTrigger("daily-summary")}
            disabled={!!triggerLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {triggerLoading === "daily-summary" ? "Running…" : "1. Daily Summary"}
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
            {triggerLoading === "check-compliance" ? "Running…" : "4. Check Compliance"}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-600">
          1 = create & send daily summaries • 2 = weather alerts (if threshold hit) • 3 = send queued messages • 4 = send no-upload warnings
        </p>
        {triggerResult && (
          <pre className="mt-4 p-4 bg-gray-200 rounded-md border border-gray-300 text-gray-900 text-sm overflow-auto max-h-48 font-mono">{triggerResult}</pre>
        )}
      </div>
    </div>
  );

  // return (
  //   <div className="space-y-6">
  //     <div>
  //       <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
  //       <p className="mt-1 text-sm text-gray-500">
  //         Overview of system activity and performance
  //       </p>
  //     </div>

  //     {/* Overview Stats */}
  //     <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
  //       <div className="bg-white overflow-hidden shadow rounded-lg">
  //         <div className="p-5">
  //           <div className="flex items-center">
  //             <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
  //               <span className="text-2xl">🏙️</span>
  //             </div>
  //             <div className="ml-5 w-0 flex-1">
  //               <dl>
  //                 <dt className="text-sm font-medium text-gray-500 truncate">
  //                   Total Cities
  //                 </dt>
  //                 <dd className="text-lg font-medium text-gray-900">
  //                   {data.overview.totalCities}
  //                 </dd>
  //               </dl>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       <div className="bg-white overflow-hidden shadow rounded-lg">
  //         <div className="p-5">
  //           <div className="flex items-center">
  //             <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
  //               <span className="text-2xl">🏢</span>
  //             </div>
  //             <div className="ml-5 w-0 flex-1">
  //               <dl>
  //                 <dt className="text-sm font-medium text-gray-500 truncate">
  //                   Active Buildings
  //                 </dt>
  //                 <dd className="text-lg font-medium text-gray-900">
  //                   {data.overview.activeBuildings} /{" "}
  //                   {data.overview.totalBuildings}
  //                 </dd>
  //               </dl>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       <div className="bg-white overflow-hidden shadow rounded-lg">
  //         <div className="p-5">
  //           <div className="flex items-center">
  //             <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
  //               <span className="text-2xl">💬</span>
  //             </div>
  //             <div className="ml-5 w-0 flex-1">
  //               <dl>
  //                 <dt className="text-sm font-medium text-gray-500 truncate">
  //                   Total Messages
  //                 </dt>
  //                 <dd className="text-lg font-medium text-gray-900">
  //                   {data.overview.totalMessages.toLocaleString()}
  //                 </dd>
  //               </dl>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       <div className="bg-white overflow-hidden shadow rounded-lg">
  //         <div className="p-5">
  //           <div className="flex items-center">
  //             <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
  //               <span className="text-2xl">✅</span>
  //             </div>
  //             <div className="ml-5 w-0 flex-1">
  //               <dl>
  //                 <dt className="text-sm font-medium text-gray-500 truncate">
  //                   Compliance Rate
  //                 </dt>
  //                 <dd className="text-lg font-medium text-gray-900">
  //                   {data.overview.overallComplianceRate.toFixed(1)}%
  //                 </dd>
  //               </dl>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     </div>

  //     {/* Energy Savings */}
  //     {data.energySavings && (
  //       <div className="bg-white shadow rounded-lg p-6">
  //         <h2 className="text-lg font-medium text-gray-900 mb-4">
  //           Energy Savings Summary
  //         </h2>
  //         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
  //           <div>
  //             <p className="text-sm text-gray-500">Total Savings</p>
  //             <p className="text-2xl font-bold text-green-600">
  //               {data.energySavings.totalSavingsKBTU.toLocaleString()} kBTU
  //             </p>
  //           </div>
  //           <div>
  //             <p className="text-sm text-gray-500">Average Savings</p>
  //             <p className="text-2xl font-bold text-green-600">
  //               {data.energySavings.avgSavingsPercentage.toFixed(1)}%
  //             </p>
  //           </div>
  //         </div>
  //       </div>
  //     )}

  //     {/* City Stats */}
  //     <div className="bg-white shadow rounded-lg">
  //       <div className="px-4 py-5 sm:p-6">
  //         <h2 className="text-lg font-medium text-gray-900 mb-4">
  //           City Statistics
  //         </h2>
  //         <div className="overflow-x-auto">
  //           <table className="min-w-full divide-y divide-gray-200">
  //             <thead className="bg-gray-50">
  //               <tr>
  //                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  //                   City
  //                 </th>
  //                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  //                   Buildings
  //                 </th>
  //                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  //                   Active
  //                 </th>
  //                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  //                   Alerts
  //                 </th>
  //               </tr>
  //             </thead>
  //             <tbody className="bg-white divide-y divide-gray-200">
  //               {data.cityStats.map((city) => (
  //                 <tr key={city.cityId}>
  //                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
  //                     {city.cityName}
  //                   </td>
  //                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  //                     {city.buildingCount}
  //                   </td>
  //                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  //                     {city.activeBuildingCount}
  //                   </td>
  //                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  //                     {city.totalAlerts}
  //                   </td>
  //                 </tr>
  //               ))}
  //             </tbody>
  //           </table>
  //         </div>
  //       </div>
  //     </div>

  //     {/* Recent Alerts */}
  //     <div className="bg-white shadow rounded-lg">
  //       <div className="px-4 py-5 sm:p-6">
  //         <h2 className="text-lg font-medium text-gray-900 mb-4">
  //           Recent Alerts
  //         </h2>
  //         <div className="space-y-3">
  //           {data.recentAlerts.slice(0, 5).map((alert) => (
  //             <div
  //               key={alert.id}
  //               className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
  //             >
  //               <div>
  //                 <p className="text-sm font-medium text-gray-900">
  //                   {alert.cityName}
  //                 </p>
  //                 <p className="text-xs text-gray-500">
  //                   {alert.alertType.replace("_", " ")}
  //                 </p>
  //               </div>
  //               <div className="text-xs text-gray-500">
  //                 {new Date(alert.triggeredAt).toLocaleDateString()}
  //               </div>
  //             </div>
  //           ))}
  //         </div>
  //       </div>
  //     </div>

  //     {/* Recent Energy Reports */}
  //     {data.energyReports && data.energyReports.length > 0 && (
  //       <div className="bg-white shadow rounded-lg">
  //         <div className="px-4 py-5 sm:p-6">
  //           <h2 className="text-lg font-medium text-gray-900 mb-4">
  //             Recent Energy Reports
  //           </h2>
  //           <div className="space-y-3">
  //             {data.energyReports.slice(0, 5).map((report) => (
  //               <div
  //                 key={report.id}
  //                 className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
  //               >
  //                 <div>
  //                   <p className="text-sm font-medium text-gray-900">
  //                     {report.buildingName}
  //                   </p>
  //                   <p className="text-xs text-gray-500">
  //                     {monthNames[report.month - 1]} {report.year}
  //                   </p>
  //                 </div>
  //                 <div className="text-right">
  //                   <p className="text-sm font-medium text-green-600">
  //                     {report.savingsPercentage >= 0 ? "+" : ""}
  //                     {report.savingsPercentage.toFixed(1)}%
  //                   </p>
  //                   {report.pdfUrl && (
  //                     <a
  //                       href={report.pdfUrl}
  //                       target="_blank"
  //                       rel="noopener noreferrer"
  //                       className="text-xs text-blue-600 hover:underline"
  //                     >
  //                       View Report
  //                     </a>
  //                   )}
  //                 </div>
  //               </div>
  //             ))}
  //           </div>
  //         </div>
  //       </div>
  //     )}
  //   </div>
  // );
}
