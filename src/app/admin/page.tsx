"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardData {
  overview: {
    totalCities: number;
    totalBuildings: number;
    activeBuildings: number;
    pausedBuildings: number;
    totalMessages: number;
    totalAlerts: number;
    failedMessages: number;
    overallComplianceRate: number;
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
    complianceRate: number;
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
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of system activity and performance
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <span className="text-2xl">🏙️</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Cities
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data.overview.totalCities}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <span className="text-2xl">🏢</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Buildings
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data.overview.activeBuildings} / {data.overview.totalBuildings}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <span className="text-2xl">💬</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Messages
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data.overview.totalMessages.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Compliance Rate
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data.overview.overallComplianceRate.toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Energy Savings */}
      {data.energySavings && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Energy Savings Summary
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Total Savings</p>
              <p className="text-2xl font-bold text-green-600">
                {data.energySavings.totalSavingsKBTU.toLocaleString()} kBTU
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Savings</p>
              <p className="text-2xl font-bold text-green-600">
                {data.energySavings.avgSavingsPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* City Stats */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            City Statistics
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buildings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alerts
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.cityStats.map((city) => (
                  <tr key={city.cityId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {city.cityName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {city.buildingCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {city.activeBuildingCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {city.totalAlerts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Recent Alerts
          </h2>
          <div className="space-y-3">
            {data.recentAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {alert.cityName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {alert.alertType.replace("_", " ")}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(alert.triggeredAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Energy Reports */}
      {data.energyReports && data.energyReports.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Recent Energy Reports
            </h2>
            <div className="space-y-3">
              {data.energyReports.slice(0, 5).map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {report.buildingName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {monthNames[report.month - 1]} {report.year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      {report.savingsPercentage >= 0 ? "+" : ""}
                      {report.savingsPercentage.toFixed(1)}%
                    </p>
                    {report.pdfUrl && (
                      <a
                        href={report.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View Report
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
