"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
    complianceRate: number;
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
    uploadedAt: string;
    isCompliant: boolean;
    messageType: string;
    sentAt: string;
  }>;
  latestEnergyReport: {
    month: number;
    year: number;
    savingsPercentage: number;
    savingsKBTU: number;
    pdfUrl: string;
  } | null;
}

export default function BuildingDetailPage() {
  const params = useParams();
  const buildingId = params.id as string;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (buildingId) {
      fetchData();
    }
  }, [buildingId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/buildings/${buildingId}/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch building data");
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

  if (error || !data) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">
          {error || "Building not found"}
        </h3>
      </div>
    );
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/buildings"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← Back to Buildings
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{data.building.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{data.building.address}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Compliance Rate
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data.stats.complianceRate}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Alerts
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data.stats.totalAlerts}
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
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Recipients
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data.stats.totalRecipients}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Energy Report */}
      {data.latestEnergyReport && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Latest Energy Report
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {monthNames[data.latestEnergyReport.month - 1]}{" "}
                {data.latestEnergyReport.year}
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {data.latestEnergyReport.savingsPercentage >= 0 ? "+" : ""}
                {data.latestEnergyReport.savingsPercentage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {data.latestEnergyReport.savingsKBTU >= 0 ? "+" : ""}
                {data.latestEnergyReport.savingsKBTU.toLocaleString()} kBTU
              </p>
            </div>
            {data.latestEnergyReport.pdfUrl && (
              <a
                href={data.latestEnergyReport.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                View Report
              </a>
            )}
          </div>
        </div>
      )}

      {/* Recent Messages */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Recent Messages
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Upload
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.messages.map((message) => (
                  <tr key={message.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {message.messageType.replace("_", " ")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                        {message.deliveryStatus || (message.delivered ? "Delivered" : "Failed")}
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
        </div>
      </div>

      {/* Recent Uploads */}
      {data.recentUploads.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Recent Photo Uploads
            </h2>
            <div className="space-y-3">
              {data.recentUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {upload.fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(upload.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        upload.isCompliant
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {upload.isCompliant ? "Compliant" : "Late"}
                    </span>
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
