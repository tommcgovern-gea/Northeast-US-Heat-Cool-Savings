"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface City {
  id: string;
  name: string;
  state: string;
  nwsOffice: string;
  nwsGridX: number;
  nwsGridY: number;
  alertTempDelta: number;
  alertWindowHours: number;
  isActive: boolean;
  buildingCount: number;
}

export default function CityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cityId = params.id as string;
  const [city, setCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    state: "",
    nwsOffice: "",
    nwsGridX: "",
    nwsGridY: "",
    alertTempDelta: "",
    alertWindowHours: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cityId) {
      fetchCity();
    }
  }, [cityId]);

  const fetchCity = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/cities/${cityId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch city");
      }

      const data = await response.json();
      setCity(data);
      setFormData({
        name: data.name,
        state: data.state,
        nwsOffice: data.nwsOffice,
        nwsGridX: data.nwsGridX.toString(),
        nwsGridY: data.nwsGridY.toString(),
        alertTempDelta: data.alertTempDelta.toString(),
        alertWindowHours: data.alertWindowHours.toString(),
        isActive: data.isActive,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/cities/${cityId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          state: formData.state,
          nwsOffice: formData.nwsOffice,
          nwsGridX: parseInt(formData.nwsGridX),
          nwsGridY: parseInt(formData.nwsGridY),
          alertTempDelta: parseFloat(formData.alertTempDelta),
          alertWindowHours: parseInt(formData.alertWindowHours),
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update city");
      }

      const updated = await response.json();
      setCity(updated);
      alert("City updated successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">City not found</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/cities"
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
          >
            ← Back to Cities
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{city.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Edit city configuration</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                City Name
              </label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                type="text"
                required
                maxLength={2}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.state}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    state: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                NWS Office
              </label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.nwsOffice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nwsOffice: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Grid X
                </label>
                <input
                  type="number"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.nwsGridX}
                  onChange={(e) =>
                    setFormData({ ...formData, nwsGridX: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Grid Y
                </label>
                <input
                  type="number"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.nwsGridY}
                  onChange={(e) =>
                    setFormData({ ...formData, nwsGridY: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Alert Temperature Delta (°F)
              </label>
              <input
                type="number"
                step="0.1"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.alertTempDelta}
                onChange={(e) =>
                  setFormData({ ...formData, alertTempDelta: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Alert Window (hours)
              </label>
              <input
                type="number"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.alertWindowHours}
                onChange={(e) =>
                  setFormData({ ...formData, alertWindowHours: e.target.value })
                }
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Link
              href="/admin/cities"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
