"use client";

import { useEffect, useState } from "react";

interface Recipient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  preference: string;
  isActive: boolean;
}

interface Building {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
}

export default function RecipientsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preference: "email",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (selectedBuilding) {
      fetchRecipients();
    } else {
      setRecipients([]);
    }
  }, [selectedBuilding]);

  const fetchBuildings = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/buildings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch buildings");

      const data = await response.json();
      setBuildings(data);
      if (data.length > 0 && !selectedBuilding) {
        setSelectedBuilding(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `/api/recipients?buildingId=${selectedBuilding}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch recipients");

      const data = await response.json();
      setRecipients(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (recipient: Recipient) => {
    setEditingRecipient(recipient);
    setFormData({
      name: recipient.name || "",
      email: recipient.email || "",
      phone: recipient.phone || "",
      preference: recipient.preference,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipient) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/recipients/${editingRecipient.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          preference: formData.preference,
        }),
      });

      if (!response.ok) throw new Error("Failed to update recipient");

      setShowEditModal(false);
      setEditingRecipient(null);
      setFormData({ name: "", email: "", phone: "", preference: "email" });
      fetchRecipients();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recipient?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/recipients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete recipient");
      fetchRecipients();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.email && !formData.phone) {
      setError("Email or phone is required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/recipients", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buildingId: selectedBuilding,
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          preference: formData.preference,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create recipient");
      }

      setShowCreateModal(false);
      setFormData({ name: "", email: "", phone: "", preference: "email" });
      fetchRecipients();
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
          <h1 className="text-3xl font-bold text-gray-900">Recipients</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage message recipients for buildings
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", email: "", phone: "", preference: "email" });
            setShowCreateModal(true);
          }}
          disabled={!selectedBuilding}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          + Add Recipient
        </button>
      </div>

      {/* Building Selector */}
      <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
        <label className="block text-sm font-medium text-gray-800 mb-2">
          Select Building
        </label>
        <select
          value={selectedBuilding}
          onChange={(e) => setSelectedBuilding(e.target.value)}
          className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a building</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id} className="text-gray-900 bg-white">
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

      {selectedBuilding && (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          {recipients.length === 0 ? (
            <div className="p-8 text-center text-gray-700 bg-gray-50">
              <p className="font-medium">No recipients yet.</p>
              <p className="text-sm mt-1">Click &quot;+ Add Recipient&quot; to create one.</p>
            </div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Preference</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recipients.map((recipient) => (
                <tr key={recipient.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {recipient.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {recipient.email || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {recipient.phone || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    <span className="capitalize">{recipient.preference}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${recipient.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {recipient.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(recipient)}
                      className="text-blue-700 hover:text-blue-900 font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(recipient.id)}
                      className="text-red-700 hover:text-red-900 font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-80"
              onClick={() => setShowCreateModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full border-2 border-gray-200">
              <form onSubmit={handleCreate}>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Add Recipient
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Recipient name"
                        className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="email@example.com"
                        className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">
                        Phone
                      </label>
                      <p className="text-xs text-amber-700 mb-1">Use the recipient&apos;s personal phone (not your Twilio sender number)</p>
                      <input
                        type="tel"
                        placeholder="+1234567890"
                        className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">
                        Communication Preference
                      </label>
                      <select
                        className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.preference}
                        onChange={(e) =>
                          setFormData({ ...formData, preference: e.target.value as any })
                        }
                      >
                        <option value="email" className="text-gray-900 bg-white">Email</option>
                        <option value="sms" className="text-gray-900 bg-white">SMS</option>
                        <option value="both" className="text-gray-900 bg-white">Both</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border-2 border-gray-400 rounded-md text-gray-800 bg-white font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
                  >
                    Create
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
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-80"
              onClick={() => setShowEditModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full border-2 border-gray-200">
              <form onSubmit={handleUpdate}>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Edit Recipient
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Name</label>
                      <input
                        type="text"
                        required
                        className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Email</label>
                      <input
                        type="email"
                        className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Phone</label>
                      <input
                        type="tel"
                        className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Communication Preference</label>
                      <select
                        className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.preference}
                        onChange={(e) => setFormData({ ...formData, preference: e.target.value as any })}
                      >
                        <option value="email" className="text-gray-900 bg-white">Email</option>
                        <option value="sms" className="text-gray-900 bg-white">SMS</option>
                        <option value="both" className="text-gray-900 bg-white">Both</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border-2 border-gray-400 rounded-md text-gray-800 bg-white font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
                  >
                    Save
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
