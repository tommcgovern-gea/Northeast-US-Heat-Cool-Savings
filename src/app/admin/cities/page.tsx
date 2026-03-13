"use client";

import { useEffect, useState } from "react";
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
  createdAt: string;
}

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    state: "",
    nwsOffice: "",
    nwsGridX: "",
    nwsGridY: "",
    alertTempDelta: "5",
    alertWindowHours: "6",
  });

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchCities();
  }, []);

  const handleCitySearch = async (query: string) => {
    setFormData((prev) => ({ ...prev, name: query }));
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/admin/cities/search?q=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setSearching(false);
    }
  };

  const selectSuggestion = (s: any) => {
    setFormData({
      ...formData,
      name: s.name,
      state: s.state,
      nwsOffice: s.nwsOffice,
      nwsGridX: s.nwsGridX.toString(),
      nwsGridY: s.nwsGridY.toString(),
    });
    setSuggestions([]);
  };

  const fetchCities = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/cities", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch cities");
      }

      const data = await response.json();
      setCities(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/cities", {
        method: "POST",
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
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create city");
      }

      setShowCreateModal(false);
      setFormData({
        name: "",
        state: "",
        nwsOffice: "",
        nwsGridX: "",
        nwsGridY: "",
        alertTempDelta: "5",
        alertWindowHours: "6",
      });
      fetchCities();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to (deactivate) this city?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/cities/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete city");
      fetchCities();
    } catch (err: any) {
      setError(err.message);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cities</h1>
          <p className="mt-1 text-sm text-gray-800">
            Manage cities and their alert configurations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          + Add City
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                City
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                State
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                NWS Grid
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Alert Config
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Buildings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cities.map((city) => (
              <tr key={city.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {city.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {city.state}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {city.nwsOffice} ({city.nwsGridX}, {city.nwsGridY})
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {city.alertTempDelta}°F / {city.alertWindowHours}h
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {city.buildingCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      city.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {city.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Link
                    href={`/admin/cities/${city.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(city.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={() => {
                setShowCreateModal(false);
                setSuggestions([]);
              }}
            />
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreate}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Create New City
                  </h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700">
                        Search City
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Type to search (e.g. Buffalo, NY)"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                        value={formData.name}
                        onChange={(e) => handleCitySearch(e.target.value)}
                      />
                      {searching && (
                        <div className="absolute right-3 top-9">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                      {suggestions.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                          {suggestions.map((s, idx) => (
                            <div
                              key={idx}
                              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-600 hover:text-white text-black"
                              onClick={() => selectSuggestion(s)}
                            >
                              {s.displayName}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          State
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={2}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
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
                          maxLength={4}
                          placeholder="e.g. OKX — or search city above to auto-fill"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                          value={formData.nwsOffice}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nwsOffice: e.target.value.toUpperCase().replace(/\s/g, ""),
                            })
                          }
                        />
                        <p className="mt-1 text-xs text-gray-800">3-letter code (OKX, LWX, BOS). Search city above to fill automatically.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Grid X
                        </label>
                        <input
                          type="number"
                          required
                          min={0}
                          max={999}
                          placeholder="e.g. 33"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                          value={formData.nwsGridX}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nwsGridX: e.target.value,
                            })
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
                          min={0}
                          max={999}
                          placeholder="e.g. 35"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                          value={formData.nwsGridY}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nwsGridY: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-800 -mt-2">Grid X/Y: integers for the NWS office. Search city above to auto-fill, or use api.weather.gov.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Alert Temp Delta (°F)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                          value={formData.alertTempDelta}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              alertTempDelta: e.target.value,
                            })
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
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                          value={formData.alertWindowHours}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              alertWindowHours: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {createLoading ? "Creating…" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSuggestions([]);
                    }}
                    disabled={createLoading}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
