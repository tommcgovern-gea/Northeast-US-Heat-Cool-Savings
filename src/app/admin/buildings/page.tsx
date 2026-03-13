"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Building {
  id: string;
  name: string;
  address: string;
  cityId: string;
  cityName: string;
  isActive: boolean;
  isPaused: boolean;
  recipientCount: number;
  complianceRate: number | null;
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    cityId: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const [buildingsRes, citiesRes] = await Promise.all([
        fetch("/api/buildings", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/cities", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!buildingsRes.ok || !citiesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [buildingsData, citiesData] = await Promise.all([
        buildingsRes.json(),
        citiesRes.json(),
      ]);

      setBuildings(buildingsData);
      setCities(citiesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (buildingId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/buildings/${buildingId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: true, isPaused: false }),
      });

      if (!response.ok) {
        throw new Error("Failed to activate building");
      }

      fetchData();
      setShowCreateModal(false);
      setFormData({ name: "", address: "", cityId: "" });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/buildings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create building");
      }

      setShowCreateModal(false);
      setFormData({ name: "", address: "", cityId: "" });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handlePause = async (buildingId: string, isPaused: boolean) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/buildings/${buildingId}/pause`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPaused: !isPaused }),
      });

      if (!response.ok) {
        throw new Error("Failed to update building status");
      }

      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (building: Building) => {
    setEditingBuilding(building);
    setFormData({
      name: building.name,
      address: building.address,
      cityId: building.cityId,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuilding) return;

    setUpdateLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/buildings/${editingBuilding.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
        }),
      });

      if (!response.ok) throw new Error("Failed to update building");

      setShowEditModal(false);
      setEditingBuilding(null);
      setFormData({ name: "", address: "", cityId: "" });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this building? This will also remove associated recipients and alert logs.")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/buildings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete building");
      fetchData();
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
          <h1 className="text-3xl font-bold text-gray-900">Buildings</h1>
          <p className="mt-1 text-sm text-gray-800">
            Manage buildings and their settings
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          + Add Building
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
                Building
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                City
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Recipients
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Compliance
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
            {buildings.map((building) => (
              <tr key={building.id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {building.name}
                  </div>
                  <div className="text-sm text-gray-800">{building.address}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {building.cityName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {building.recipientCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {building.complianceRate != null ? `${building.complianceRate.toFixed(1)}%` : "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${building.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {building.isActive ? "Active" : "Inactive"}
                    </span>
                    {building.isPaused && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Paused
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Link
                    href={`/admin/buildings/${building.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleEdit(building)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handlePause(building.id, building.isPaused)}
                    className="text-yellow-600 hover:text-yellow-900"
                  >
                    {building.isPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={() => handleDelete(building.id)}
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
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setShowCreateModal(false);
                setFormData({ name: "", address: "", cityId: "" });
              }}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full relative">
              <form onSubmit={handleCreate}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 mb-1">
                    Add Building to Watch
                  </h3>
                  <p className="text-sm text-gray-800 mb-4">
                    Select a city first to see existing buildings or add a new one.
                  </p>

                  <div className="space-y-6">
                    {/* 1. City Selection (Top) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        1. Select City
                      </label>
                      <select
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black font-medium"
                        value={formData.cityId}
                        onChange={(e) =>
                          setFormData({ ...formData, cityId: e.target.value })
                        }
                      >
                        <option value="">Choose a city...</option>
                        {cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}, {city.state}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.cityId && (
                      <>
                        {/* 2. Existing Buildings List */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            2. Existing Buildings in this City
                          </label>
                          <div className="border rounded-md max-h-40 overflow-y-auto bg-gray-50 shadow-inner">
                            {buildings.filter(b => b.cityId === formData.cityId).length > 0 ? (
                              <ul className="divide-y divide-gray-200">
                                {buildings
                                  .filter(b => b.cityId === formData.cityId)
                                  .map((b) => (
                                    <li key={b.id} className="p-3 flex justify-between items-center hover:bg-white transition-colors">
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">{b.name}</div>
                                        <div className="text-xs text-gray-500">{b.address}</div>
                                      </div>
                                      <div className="flex items-center space-x-3">
                                        {b.isActive ? (
                                          <span className="text-[10px] px-2 py-0.5 font-bold rounded-full bg-green-100 text-green-700 uppercase">
                                            Watching
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleActivate(b.id)}
                                            className="text-[10px] px-3 py-1 font-bold rounded-md bg-blue-600 text-white hover:bg-blue-700 uppercase"
                                          >
                                            Add to Watch
                                          </button>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                              </ul>
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-800 italic">
                                No buildings added yet in this city.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. New Building Section */}
                        <div className="pt-4 border-t">
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            3. Add New Building
                          </label>
                          <div className="space-y-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Building Name
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Empire State Building"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                                value={formData.name}
                                onChange={(e) =>
                                  setFormData({ ...formData, name: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Address
                              </label>
                              <textarea
                                rows={2}
                                placeholder="Full street address"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                                value={formData.address}
                                onChange={(e) =>
                                  setFormData({ ...formData, address: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t">
                  <button
                    type="submit"
                    disabled={!formData.cityId || !formData.name || !formData.address || createLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createLoading ? "Creating…" : "Create Building"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ name: "", address: "", cityId: "" });
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setShowEditModal(false);
                setFormData({ name: "", address: "", cityId: "" });
              }}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full relative">
              <form onSubmit={handleUpdate}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 mb-1">
                    Edit Building
                  </h3>
                  <p className="text-sm text-gray-800 mb-4">
                    Update building details.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Building Name
                      </label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Address
                      </label>
                      <textarea
                        rows={3}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t">
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {updateLoading ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setFormData({ name: "", address: "", cityId: "" });
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
