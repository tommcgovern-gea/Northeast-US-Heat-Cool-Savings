"use client";

import { useEffect, useState } from "react";

interface Building {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
}

interface EnergyData {
  buildingId: string;
  degreeDays?: Array<{
    id: string;
    month: number;
    year: number;
    hdd: number;
    cdd: number;
  }>;
  utilityHistory: Array<{
    id: string;
    month: number;
    year: number;
    electricKWH: number | null;
    gasTherms: number | null;
    fuelOilGallons: number | null;
    districtSteamMBTU: number | null;
    totalKBTU: number;
    uploadedAt: string;
  }>;
  baselines: Array<{
    id: string;
    month: number;
    baselineType: string;
    avgConsumptionPerDegreeDay: number;
    baselinePeriodStart: string;
    baselinePeriodEnd: string;
    dataPoints: number;
    calculatedAt: string;
  }>;
  recentReports: Array<{
    id: string;
    month: number;
    year: number;
    savingsPercentage: number;
    savingsKBTU: number;
    pdfUrl: string;
    generatedAt: string;
    emailedTo: string[];
  }>;
}

export default function EnergyPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [energyData, setEnergyData] = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<"manual" | "excel">("manual");
  const [excelType, setExcelType] = useState<"utility" | "degree-days">("utility");
  const [excelUploading, setExcelUploading] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    month: "",
    year: "",
    electricKWH: "",
    gasTherms: "",
    fuelOilGallons: "",
    districtSteamMBTU: "",
    totalKBTU: "",
  });
  const [reportFormData, setReportFormData] = useState({
    month: "",
    year: "",
    emailTo: "",
  });

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (selectedBuilding) {
      fetchEnergyData();
    } else {
      setEnergyData(null);
    }
  }, [selectedBuilding]);

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
      if (data.length > 0) {
        setSelectedBuilding(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnergyData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/buildings/${selectedBuilding}/energy`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch energy data");

      const data = await response.json();
      setEnergyData(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/staff/upload-utility", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buildingId: selectedBuilding,
          month: parseInt(uploadFormData.month),
          year: parseInt(uploadFormData.year),
          electricKWH: uploadFormData.electricKWH
            ? parseFloat(uploadFormData.electricKWH)
            : undefined,
          gasTherms: uploadFormData.gasTherms
            ? parseFloat(uploadFormData.gasTherms)
            : undefined,
          fuelOilGallons: uploadFormData.fuelOilGallons
            ? parseFloat(uploadFormData.fuelOilGallons)
            : undefined,
          districtSteamMBTU: uploadFormData.districtSteamMBTU
            ? parseFloat(uploadFormData.districtSteamMBTU)
            : undefined,
          totalKBTU: parseFloat(uploadFormData.totalKBTU),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to upload utility data");
      }

      setShowUploadModal(false);
      setUploadFormData({
        month: "",
        year: "",
        electricKWH: "",
        gasTherms: "",
        fuelOilGallons: "",
        districtSteamMBTU: "",
        totalKBTU: "",
      });
      fetchEnergyData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExcelUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fileInput = (e.target as HTMLFormElement).querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Please select an Excel file");
      return;
    }
    try {
      setExcelUploading(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) return;

      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", excelType);
      if (excelType === "utility") {
        fd.append("buildingId", selectedBuilding);
      } else {
        const building = buildings.find((b) => b.id === selectedBuilding);
        if (!building?.cityId) {
          setError("No city selected");
          return;
        }
        fd.append("cityId", building.cityId);
      }

      const response = await fetch("/api/staff/upload-excel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Upload failed");

      setShowUploadModal(false);
      setExcelUploading(false);
      fileInput.value = "";
      fetchEnergyData();
      const msg = data.errors?.length
        ? `Processed ${data.processed} rows. Some errors: ${data.errors.slice(0, 3).join("; ")}`
        : `Upload complete. Processed ${data.processed} rows.`;
      alert(msg);
    } catch (err: any) {
      setError(err.message);
      setExcelUploading(false);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/staff/generate-report", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buildingId: selectedBuilding,
          month: parseInt(reportFormData.month),
          year: parseInt(reportFormData.year),
          emailTo: reportFormData.emailTo || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setShowReportModal(false);
        setReportFormData({ month: "", year: "", emailTo: "" });
        setError(data.message || "Failed to generate report");
        return;
      }

      setShowReportModal(false);
      setReportFormData({ month: "", year: "", emailTo: "" });
      setError("");
      fetchEnergyData();
      alert("Report generated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Energy & Reports</h1>
          <p className="mt-1 text-sm text-gray-800">
            Manage utility data and generate energy savings reports
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={!selectedBuilding}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            + Upload Data
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            disabled={!selectedBuilding}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Building Selector */}
      <div className="bg-white shadow rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Building
        </label>
        <select
          value={selectedBuilding}
          onChange={(e) => setSelectedBuilding(e.target.value)}
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a building</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name} - {building.cityName}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      {energyData && (
        <>
          {/* Degree Days (HDD/CDD) */}
          {(energyData.degreeDays?.length ?? 0) > 0 ? (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Degree Days (HDD / CDD)
              </h2>
              <p className="text-sm text-gray-800 mb-4">
                Heating Degree Days (HDD) and Cooling Degree Days (CDD) for this city. Upload via Excel (Degree Days type).
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        HDD (Heating)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-sky-700 uppercase tracking-wider">
                        CDD (Cooling)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(energyData.degreeDays ?? []).map((dd) => (
                      <tr key={dd.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {monthNames[dd.month - 1]} {dd.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-800">
                          {(Number(dd.hdd ?? 0) || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-sky-800">
                          {(Number(dd.cdd ?? 0) || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-amber-900 mb-2">
                Degree Days (HDD / CDD)
              </h2>
              <p className="text-sm text-amber-800 mb-2">
                No degree days data yet. HDD (Heating Degree Days) and CDD (Cooling Degree Days) normalize energy use by weather severity.
              </p>
              <p className="text-sm text-amber-700">
                Upload via <strong>+ Upload Data</strong> → <strong>Upload Excel</strong> → select <strong>Degree Days (HDD/CDD per city)</strong>. Columns: month, year, hdd, cdd.
              </p>
            </div>
          )}

          {/* Baselines */}
          {energyData.baselines.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Calculated Baselines
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {energyData.baselines.map((baseline) => (
                  <div
                    key={baseline.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {monthNames[baseline.month - 1]} - {baseline.baselineType}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {baseline.avgConsumptionPerDegreeDay.toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-800 mt-1">
                      kBTU per {baseline.baselineType === "heating" ? "HDD" : "CDD"}
                    </p>
                    <p className="text-xs text-gray-800 mt-2">
                      {baseline.dataPoints} data points
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reports */}
          {energyData.recentReports.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Recent Reports
              </h2>
              <div className="space-y-3">
                {energyData.recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {monthNames[report.month - 1]} {report.year}
                      </p>
                      <p className="text-sm text-gray-800 mt-1">
                        Savings:{" "}
                        <span
                          className={`font-bold ${
                            report.savingsPercentage >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {report.savingsPercentage >= 0 ? "+" : ""}
                          {report.savingsPercentage.toFixed(1)}%
                        </span>{" "}
                        ({report.savingsKBTU >= 0 ? "+" : ""}
                        {report.savingsKBTU.toLocaleString()} kBTU)
                      </p>
                    </div>
                    {report.pdfUrl && (
                      <a
                        href={report.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        View PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Utility History */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Utility Consumption History
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Electric
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Gas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Total kBTU
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {energyData.utilityHistory.map((utility) => (
                      <tr key={utility.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {monthNames[utility.month - 1]} {utility.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {utility.electricKWH
                            ? utility.electricKWH.toLocaleString() + " kWh"
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {utility.gasTherms
                            ? utility.gasTherms.toLocaleString() + " therms"
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {utility.totalKBTU.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 transition-opacity"
              onClick={() => setShowUploadModal(false)}
              aria-hidden="true"
            />
            <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Upload Data
                </h3>
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    type="button"
                    onClick={() => setUploadMode("manual")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      uploadMode === "manual"
                        ? "border-blue-600 text-blue-700"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Manual Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode("excel")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      uploadMode === "excel"
                        ? "border-blue-600 text-blue-700"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Upload Excel
                  </button>
                </div>

                {uploadMode === "manual" ? (
              <form onSubmit={handleUpload}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-800">
                          Month
                        </label>
                        <select
                          required
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={uploadFormData.month}
                          onChange={(e) =>
                            setUploadFormData({
                              ...uploadFormData,
                              month: e.target.value,
                            })
                          }
                        >
                          <option value="">Select</option>
                          {monthNames.map((name, idx) => (
                            <option key={idx} value={idx + 1}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800">
                          Year
                        </label>
                        <input
                          type="number"
                          required
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={uploadFormData.year}
                          onChange={(e) =>
                            setUploadFormData({
                              ...uploadFormData,
                              year: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Electric (kWh) - Optional
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={uploadFormData.electricKWH}
                        onChange={(e) =>
                          setUploadFormData({
                            ...uploadFormData,
                            electricKWH: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Gas (therms) - Optional
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={uploadFormData.gasTherms}
                        onChange={(e) =>
                          setUploadFormData({
                            ...uploadFormData,
                            gasTherms: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Total kBTU *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={uploadFormData.totalKBTU}
                        onChange={(e) =>
                          setUploadFormData({
                            ...uploadFormData,
                            totalKBTU: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                <div className="mt-6 flex flex-row-reverse gap-2 border-t border-gray-200 pt-4">
                  <button
                    type="submit"
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
                ) : (
              <form onSubmit={handleExcelUpload}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Data Type
                      </label>
                      <select
                        value={excelType}
                        onChange={(e) => setExcelType(e.target.value as "utility" | "degree-days")}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="utility">Utility (kBTU per building)</option>
                        <option value="degree-days">Degree Days (HDD/CDD per city)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Excel File (.xlsx, .xls)
                      </label>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        required
                        className="block w-full text-sm text-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700"
                      />
                      <p className="mt-1 text-xs text-gray-800">
                        {excelType === "utility" ? "Columns: month, year, totalKBTU (optional: electricKWH, gasTherms, fuelOilGallons, districtSteamMBTU)" : "Columns: month, year, hdd, cdd (or heating_degree_days, cooling_degree_days)"}
                      </p>
                    </div>
                  </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2 mt-4">
                  <button
                    type="submit"
                    disabled={excelUploading}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 sm:text-sm"
                  >
                    {excelUploading ? "Uploading…" : "Upload"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    disabled={excelUploading}
                    className="rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 transition-opacity"
              onClick={() => setShowReportModal(false)}
              aria-hidden="true"
            />
            <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
              <form onSubmit={handleGenerateReport}>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Generate Energy Report
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-800">
                          Month
                        </label>
                        <select
                          required
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={reportFormData.month}
                          onChange={(e) =>
                            setReportFormData({
                              ...reportFormData,
                              month: e.target.value,
                            })
                          }
                        >
                          <option value="">Select</option>
                          {monthNames.map((name, idx) => (
                            <option key={idx} value={idx + 1}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800">
                          Year
                        </label>
                        <input
                          type="number"
                          required
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={reportFormData.year}
                          onChange={(e) =>
                            setReportFormData({
                              ...reportFormData,
                              year: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Email To (optional)
                      </label>
                      <input
                        type="email"
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={reportFormData.emailTo}
                        onChange={(e) =>
                          setReportFormData({
                            ...reportFormData,
                            emailTo: e.target.value,
                          })
                        }
                        placeholder="engineer@example.com"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-row-reverse gap-2 border-t border-gray-200 pt-4">
                  <button
                    type="submit"
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm"
                  >
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
