"use client";

import { useEffect, useState } from "react";
import { PaginationBar } from "@/components/PaginationBar";

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
  degreeDaysTotal?: number;
  degreeDaysPage?: number;
  degreeDaysLimit?: number;
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
  utilityTotal?: number;
  utilityPage?: number;
  utilityLimit?: number;
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
  reportEligiblePeriods?: Array<{ month: number; year: number }>;
  lastUtilityUploadAt?: string | null;
  lastDegreeDayUploadAt?: string | null;
}

export default function EnergyPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [energyData, setEnergyData] = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [energyLoading, setEnergyLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<"manual" | "excel">("manual");
  const [excelType, setExcelType] = useState<"utility" | "degree-days">("utility" );
  const [excelUploading, setExcelUploading] = useState(false);
  const [uploadManualLoading, setUploadManualLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [uploadManualDataType, setUploadManualDataType] = useState<
    "utility" | "degree-days"
  >("utility");
  const [uploadFormData, setUploadFormData] = useState({
    month: "",
    year: "",
    electricKWH: "",
    gasTherms: "",
    fuelOilGallons: "",
    districtSteamMBTU: "",
    totalKBTU: "",
    hdd: "",
    cdd: "",
  });
  const [reportFormData, setReportFormData] = useState({
    month: "",
    year: "",
    emailTo: "",
  });
  const [linkCopiedReportId, setLinkCopiedReportId] = useState<string | null>(
    null,
  );
  const [utilityPage, setUtilityPage] = useState(1);
  const [utilityLimit, setUtilityLimit] = useState(10);
  const [degreeDaysPage, setDegreeDaysPage] = useState(1);
  const [degreeDaysLimit, setDegreeDaysLimit] = useState(10);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (selectedBuilding) {
      setUtilityPage(1);
      setDegreeDaysPage(1);
      setEnergyData(null);
      setEnergyLoading(true);
      fetchEnergyData();
    } else {
      setEnergyData(null);
    }
  }, [selectedBuilding]);

  useEffect(() => {
    if (!selectedBuilding || energyData === null) return;
    fetchEnergyData();
  }, [
    utilityPage,
    utilityLimit,
    degreeDaysPage,
    degreeDaysLimit,
    selectedBuilding,
  ]);

  useEffect(() => {
    if (!showReportModal) return;
    const periods = energyData?.reportEligiblePeriods;
    if (!periods?.length) return;
    const first = periods[0];
    setReportFormData((prev) => ({
      emailTo: prev.emailTo,
      month: String(first.month),
      year: String(first.year),
    }));
  }, [showReportModal, energyData?.reportEligiblePeriods]);

  useEffect(() => {
    if (!successMessage) return;
    const id = setTimeout(() => setSuccessMessage(""), 8000);
    return () => clearTimeout(id);
  }, [successMessage]);

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

      const params = new URLSearchParams({
        utilityPage: String(utilityPage),
        utilityLimit: String(utilityLimit),
        degreeDaysPage: String(degreeDaysPage),
        degreeDaysLimit: String(degreeDaysLimit),
      });
      const response = await fetch(
        `/api/buildings/${selectedBuilding}/energy?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) throw new Error("Failed to fetch energy data");

      const data = await response.json();
      setEnergyData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnergyLoading(false);
    }
  };

  const formatUploadAt = (iso: string | null | undefined) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return null;
    }
  };

  const downloadEnergyTemplate = async (type: "utility" | "degree-days") => {
    try {
      setError("");
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(
        `/api/staff/energy-upload-template?type=${type}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        type === "utility"
          ? "utility-upload-template.xlsx"
          : "degree-days-upload-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadManualLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      if (uploadManualDataType === "degree-days") {
        const building = buildings.find((b) => b.id === selectedBuilding);
        if (!building?.cityId) {
          setError("Selected building has no city");
          setUploadManualLoading(false);
          return;
        }
        const response = await fetch("/api/staff/upload-degree-days", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cityId: building.cityId,
            month: parseInt(uploadFormData.month),
            year: parseInt(uploadFormData.year),
            heatingDegreeDays: parseFloat(uploadFormData.hdd),
            coolingDegreeDays: parseFloat(uploadFormData.cdd || "0"),
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to upload degree days");
        }
      } else {
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
        hdd: "",
        cdd: "",
      });
      setSuccessMessage(
        uploadManualDataType === "degree-days"
          ? "Degree day data saved successfully."
          : "Utility data saved successfully.",
      );
      fetchEnergyData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadManualLoading(false);
    }
  };

  const handleExcelUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fileInput = (e.target as HTMLFormElement).querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
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
      const msg = data.errors?.length
        ? `Excel upload processed ${data.processed} rows with some issues: ${data.errors.slice(0, 3).join("; ")}`
        : `Excel upload complete. Processed ${data.processed} rows.`;
      setSuccessMessage(msg);
      fetchEnergyData();
    } catch (err: any) {
      setError(err.message);
      setExcelUploading(false);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setReportLoading(false);
        return;
      }

      const m = parseInt(reportFormData.month, 10);
      const y = parseInt(reportFormData.year, 10);
      const eligible = energyData?.reportEligiblePeriods ?? [];
      const periodOk = eligible.some((p) => p.month === m && p.year === y);
      if (!periodOk) {
        setError(
          "That month does not have both utility data for this building and degree days for its city. Upload matching data first.",
        );
        setReportLoading(false);
        return;
      }

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
      setSuccessMessage("Report generated successfully.");
      fetchEnergyData();
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setReportLoading(false);
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
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const eligiblePeriods = energyData?.reportEligiblePeriods ?? [];
  const canGenerateReport =
    Boolean(selectedBuilding) && !energyLoading && eligiblePeriods.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Energy & Reports</h1>
        <p className="mt-2 text-sm text-gray-800 max-w-3xl">
          Manage utility consumption and degree day data, then generate savings
          reports. Follow the steps below in order.
        </p>
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3 max-w-3xl">
          <p className="text-sm font-semibold text-blue-950">
            How to complete a report
          </p>
          <ol className="mt-2 list-decimal list-inside text-sm text-blue-950 space-y-1.5">
            <li>
              <span className="font-medium">Select building</span> — choose the
              site you are working on.
            </li>
            <li>
              <span className="font-medium">
                Upload utility and degree day data
              </span>{" "}
              — for each report month, add{" "}
              <span className="font-semibold">both</span> building utility
              (kBTU) and HDD/CDD for the building&apos;s city for the{" "}
              <span className="font-semibold">same month and year</span> (manual
              entry or Excel).
            </li>
            <li>
              <span className="font-medium">Generate report</span> — available
              only for months that already have both datasets.
            </li>
          </ol>
          <p className="mt-3 text-xs text-blue-900/90">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="font-medium text-blue-800 underline hover:text-blue-950"
            >
              Help
            </button>{" "}
            — short reference for uploads and reporting.
          </p>
        </div>
      </div>

      {/* Step 1: Building */}
      <div className="rounded-xl border-l-4 border-blue-600 bg-white shadow-md ring-1 ring-gray-200/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Step 1
        </p>
        <label className="mt-1 block text-base font-semibold text-gray-900">
          Select building
        </label>
        <p className="mt-1 text-sm text-gray-600">
          All uploads and reports apply to the building you choose here.
        </p>
        <select
          value={selectedBuilding}
          onChange={(e) => {
            setSelectedBuilding(e.target.value);
            setError("");
            setSuccessMessage("");
          }}
          className="mt-3 block w-full max-w-xl border border-gray-300 rounded-md shadow-sm py-2.5 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a building</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name} - {building.cityName}
            </option>
          ))}
        </select>
      </div>

      {/* Steps 2 & 3: actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-md ring-1 ring-gray-200/80 border-t-4 border-blue-500">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Step 2
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-900">
            Upload utility and degree day data
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Use one dialog for manual rows or Excel. Download templates from the
            upload window to match the required columns.
          </p>
          {energyData && !energyLoading && selectedBuilding && (
            <ul className="mt-3 space-y-1 text-xs text-gray-700">
              <li>
                Last utility upload:{" "}
                <span className="font-medium text-gray-900">
                  {formatUploadAt(energyData.lastUtilityUploadAt) ?? "—"}
                </span>
              </li>
              <li>
                Last degree day upload:{" "}
                <span className="font-medium text-gray-900">
                  {formatUploadAt(energyData.lastDegreeDayUploadAt) ?? "—"}
                </span>
              </li>
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              setError("");
              setShowUploadModal(true);
            }}
            disabled={!selectedBuilding}
            className="mt-4 inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Upload utility &amp; degree day data
          </button>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-md ring-1 ring-gray-200/80 border-t-4 border-emerald-600">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Step 3
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-900">
            Generate report
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Creates a PDF for a month that already has matching utility and
            degree day data.
          </p>
          {!canGenerateReport && selectedBuilding && !energyLoading && (
            <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Upload at least one month of utility data for this building and
              degree days for its city (same month and year) to enable report
              generation.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setError("");
              setShowReportModal(true);
            }}
            disabled={!canGenerateReport}
            title={
              !canGenerateReport
                ? "Requires overlapping utility and degree day data for at least one month"
                : undefined
            }
            className="mt-4 inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate report
          </button>
        </div>
      </div>

      {successMessage && (
        <div
          className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-emerald-900">
            {successMessage}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      {selectedBuilding && energyLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      )}

      {energyData && !energyLoading && (
        <>
          {/* Degree Days (HDD/CDD) */}
          {(energyData.degreeDaysTotal ?? 0) > 0 ? (
            <div className="bg-white shadow rounded-lg p-6 ring-1 ring-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Degree days (HDD / CDD)
              </h2>
              <p className="text-sm text-gray-700 mb-2">
                Upload or update degree day data using the required format
                (manual entry or Excel, &quot;Degree Days&quot; type). HDD/CDD
                normalize energy use for weather so consumption can be compared
                fairly month to month.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Next: ensure each report month also has utility kBTU for the
                selected building, then use Step 3 to generate the report.
              </p>
              <PaginationBar
                page={energyData.degreeDaysPage ?? 1}
                limit={energyData.degreeDaysLimit ?? 10}
                total={energyData.degreeDaysTotal ?? 0}
                onPageChange={setDegreeDaysPage}
                onLimitChange={(l) => {
                  setDegreeDaysLimit(l);
                  setDegreeDaysPage(1);
                }}
                itemLabel="rows"
                part="top"
              />
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
              <PaginationBar
                page={energyData.degreeDaysPage ?? 1}
                limit={energyData.degreeDaysLimit ?? 10}
                total={energyData.degreeDaysTotal ?? 0}
                onPageChange={setDegreeDaysPage}
                onLimitChange={(l) => {
                  setDegreeDaysLimit(l);
                  setDegreeDaysPage(1);
                }}
                itemLabel="rows"
                part="bottom"
              />
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 ring-1 ring-amber-100">
              <h2 className="text-lg font-semibold text-amber-950 mb-2">
                Degree days (HDD / CDD)
              </h2>
              <p className="text-sm text-amber-950/90 mb-2">
                No degree days yet. Upload or update degree day data using the
                required format so reports can normalize consumption against
                weather.
              </p>
              <p className="text-sm text-amber-900">
                Use <strong>Upload utility &amp; degree day data</strong> →{" "}
                <strong>Upload Excel</strong> →{" "}
                <strong>Degree Days (HDD/CDD per city)</strong>, or manual
                entry. Columns: month, year, hdd, cdd. Download the degree day
                Excel template from that dialog.
              </p>
            </div>
          )}

          {/* Baselines */}
          <div className="bg-white shadow rounded-lg p-6 ring-1 ring-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Calculated baselines
            </h2>
            {energyData.baselines.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {energyData.baselines.map((baseline) => (
                  <div
                    key={baseline.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {monthNames[baseline.month - 1]} -{" "}
                        {baseline.baselineType}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {baseline.avgConsumptionPerDegreeDay.toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-800 mt-1">
                      kBTU per{" "}
                      {baseline.baselineType === "heating" ? "HDD" : "CDD"}
                    </p>
                    <p className="text-xs text-gray-800 mt-2">
                      Baseline from{" "}
                      {new Date(baseline.baselinePeriodStart).getFullYear()}–
                      {new Date(baseline.baselinePeriodEnd).getFullYear()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-800 mb-1">
                  No baselines yet
                </p>
                <p className="text-sm text-gray-600">
                  Baselines are calculated automatically when you upload at
                  least <strong>3 years</strong> of utility data for the{" "}
                  <strong>same month</strong> and degree days exist for this
                  building’s city for those months. Use{" "}
                  <strong>Upload utility &amp; degree day data</strong> to add
                  utility (and degree day Excel if needed); the section updates
                  after save.
                </p>
              </div>
            )}
          </div>

          {/* Recent Reports */}
          {energyData.recentReports.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6 ring-1 ring-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recent reports
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
                    {report.id && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const token = localStorage.getItem("token");
                            if (!token) return;
                            const tr = await fetch(
                              `/api/reports/${report.id}/pdf-token`,
                              {
                                headers: { Authorization: `Bearer ${token}` },
                              },
                            );
                            if (!tr.ok) return;
                            const { token: linkToken } = await tr.json();
                            if (!linkToken) return;
                            window.open(
                              `${window.location.origin}/api/reports/${report.id}/pdf?t=${linkToken}`,
                              "_blank",
                            );
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          View PDF
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const token = localStorage.getItem("token");
                            if (!token) return;
                            const tr = await fetch(
                              `/api/reports/${report.id}/pdf-token`,
                              {
                                headers: { Authorization: `Bearer ${token}` },
                              },
                            );
                            if (!tr.ok) return;
                            const { token: linkToken } = await tr.json();
                            if (!linkToken) return;
                            const url = `${window.location.origin}/api/reports/${report.id}/pdf?t=${linkToken}`;
                            await navigator.clipboard.writeText(url);
                            setLinkCopiedReportId(report.id);
                            setTimeout(() => setLinkCopiedReportId(null), 2000);
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 border border-gray-300"
                        >
                          {linkCopiedReportId === report.id
                            ? "Copied!"
                            : "Copy link"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Utility History */}
          <div className="bg-white shadow rounded-lg ring-1 ring-gray-100">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Utility consumption history
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Building-level kBTU (and optional fuel breakdown). Pair each
                period with degree days for the same month and year before
                generating a report.
              </p>
              <PaginationBar
                page={energyData.utilityPage ?? 1}
                limit={energyData.utilityLimit ?? 10}
                total={energyData.utilityTotal ?? 0}
                onPageChange={setUtilityPage}
                onLimitChange={(l) => {
                  setUtilityLimit(l);
                  setUtilityPage(1);
                }}
                itemLabel="rows"
                part="top"
              />
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
                    {(energyData.utilityHistory ?? []).map((utility) => (
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
              <PaginationBar
                page={energyData.utilityPage ?? 1}
                limit={energyData.utilityLimit ?? 10}
                total={energyData.utilityTotal ?? 0}
                onPageChange={setUtilityPage}
                onLimitChange={(l) => {
                  setUtilityLimit(l);
                  setUtilityPage(1);
                }}
                itemLabel="rows"
                part="bottom"
              />
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload utility &amp; degree day data
                </h3>
                <p className="text-xs text-gray-700 mb-3">
                  To support baseline and savings reports, upload{" "}
                  <span className="font-semibold">utility</span> for this
                  building and matching{" "}
                  <span className="font-semibold">degree days</span> for its
                  city for the same month and year (manual or Excel).
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => downloadEnergyTemplate("utility")}
                    className="text-xs font-medium text-blue-700 hover:text-blue-900 underline"
                  >
                    Download utility Excel template
                  </button>
                  <span className="text-gray-300" aria-hidden>
                    |
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadEnergyTemplate("degree-days")}
                    className="text-xs font-medium text-blue-700 hover:text-blue-900 underline"
                  >
                    Download degree day Excel template
                  </button>
                </div>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Data Type *
                        </label>
                        <select
                          required
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={uploadManualDataType}
                          onChange={(e) =>
                            setUploadManualDataType(
                              e.target.value as "utility" | "degree-days",
                            )
                          }
                        >
                          <option value="utility">
                            Utility (this building)
                          </option>
                          <option value="degree-days">
                            Degree Days (this building’s city)
                          </option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-800">
                            Month *
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
                            Year *
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
                      {uploadManualDataType === "degree-days" ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-800">
                              HDD (Heating Degree Days) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              value={uploadFormData.hdd}
                              onChange={(e) =>
                                setUploadFormData({
                                  ...uploadFormData,
                                  hdd: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-800">
                              CDD (Cooling Degree Days) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              value={uploadFormData.cdd}
                              onChange={(e) =>
                                setUploadFormData({
                                  ...uploadFormData,
                                  cdd: e.target.value,
                                })
                              }
                            />
                          </div>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                    <div className="mt-6 flex flex-row-reverse gap-2 border-t border-gray-200 pt-4">
                      <button
                        type="submit"
                        disabled={uploadManualLoading}
                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 sm:text-sm"
                      >
                        {uploadManualLoading ? "Uploading…" : "Upload"}
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
                          onChange={(e) =>
                            setExcelType(
                              e.target.value as "utility" | "degree-days",
                            )
                          }
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="utility">
                            Utility (kBTU per building)
                          </option>
                          <option value="degree-days">
                            Degree Days (HDD/CDD per city)
                          </option>
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
                          {excelType === "utility"
                            ? "Columns: month, year, totalKBTU (optional: electricKWH, gasTherms, fuelOilGallons, districtSteamMBTU)"
                            : "Columns: month, year, hdd, cdd (or heating_degree_days, cooling_degree_days)"}
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

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 transition-opacity"
              onClick={() => setShowHelpModal(false)}
              aria-hidden="true"
            />
            <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Help</h3>
              <p className="text-sm text-gray-800">
                Utility rows are per building (kBTU and optional fuels). Degree
                days are per city and normalize consumption against weather so
                reports compare like-for-like months.
              </p>
              <p className="mt-2 text-sm text-gray-800">
                If report generation fails, confirm the same month and year
                exists in both the utility table and degree day table for this
                building&apos;s city.
              </p>
              <p className="mt-3 text-sm text-gray-800">
                Need help? Contact support at{" "}
                <a
                  href="mailto:tjm@geatain.com"
                  className="font-medium text-blue-700 underline hover:text-blue-900"
                >
                  tjm@geatain.com
                </a>
                .
              </p>
              <div className="mt-6 flex flex-row-reverse border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Generate Energy Report
                  </h3>
                  <p className="text-xs text-gray-700 mb-3">
                    Only periods that already have both utility data for this
                    building and degree days for its city are listed. Choose one
                    below.
                  </p>
                  <div className="space-y-4">
                    {eligiblePeriods.length > 0 ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-800">
                          Report period
                        </label>
                        <select
                          required
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={
                            reportFormData.month && reportFormData.year
                              ? `${reportFormData.month}-${reportFormData.year}`
                              : `${eligiblePeriods[0].month}-${eligiblePeriods[0].year}`
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            const i = v.indexOf("-");
                            const month = v.slice(0, i);
                            const year = v.slice(i + 1);
                            setReportFormData({
                              ...reportFormData,
                              month,
                              year,
                            });
                          }}
                        >
                          {eligiblePeriods.map((p) => (
                            <option
                              key={`${p.month}-${p.year}`}
                              value={`${p.month}-${p.year}`}
                            >
                              {monthNames[p.month - 1]} {p.year}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                        No eligible periods. Close this dialog and upload
                        matching utility and degree day data first.
                      </p>
                    )}
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
                    disabled={reportLoading || eligiblePeriods.length === 0}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 sm:text-sm"
                  >
                    {reportLoading ? "Generating…" : "Generate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    disabled={reportLoading}
                    className="rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 sm:text-sm"
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
