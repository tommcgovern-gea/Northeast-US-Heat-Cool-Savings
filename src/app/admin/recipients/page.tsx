"use client";

import { useEffect, useState } from "react";
import { IconDelete, IconEdit } from "@/components/admin/ActionIcons";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Toast } from "@/components/Toast";
import { PaginationBar } from "@/components/PaginationBar";

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
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preference: "email",
    buildingId: "",
    buildingIds: [] as string[],
    password: "",
    confirmPassword: "",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [editBuildingIds, setEditBuildingIds] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [addRecipientTab, setAddRecipientTab] = useState<'existing' | 'new'>('new');
  const [existingUsers, setExistingUsers] = useState<Array<{ id: string; email: string; name: string | null; phone: string | null; preference: string; building_ids: string[] }>>([]);
  const [existingUsersLoading, setExistingUsersLoading] = useState(false);
  const [selectedExistingUserId, setSelectedExistingUserId] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Recipient | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createModalError, setCreateModalError] = useState("");
  const [editModalError, setEditModalError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const [recipientsPage, setRecipientsPage] = useState(1);
  const [recipientsTotal, setRecipientsTotal] = useState(0);
  const [recipientsLimit, setRecipientsLimit] = useState(10);

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeValue, setRemoveValue] = useState("");
  const [removeSearching, setRemoveSearching] = useState(false);
  const [removeResults, setRemoveResults] = useState<{
    found: boolean;
    matches: Array<{ email: string | null; phone: string | null; buildings: Array<{ id: string; name: string }>; userId: string }>;
    totalBuildings: number;
  } | null>(null);
  const [removeConfirming, setRemoveConfirming] = useState(false);
  const [removeDone, setRemoveDone] = useState(false);

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    setRecipientsPage(1);
    setRecipientsLoading(true);
    setRecipients([]);
    fetchRecipients(1);
  }, [selectedBuilding]);

  useEffect(() => {
    if (recipientsPage > 1 || recipients.length > 0) {
      setRecipientsLoading(true);
      fetchRecipients();
    }
  }, [recipientsPage, recipientsLimit]);

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
        setSelectedBuilding("");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async (pageOverride?: number) => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const page = pageOverride ?? recipientsPage;

      const url = selectedBuilding
        ? `/api/recipients?buildingId=${selectedBuilding}`
        : `/api/recipients/all?page=${page}&limit=${recipientsLimit}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch recipients");

      const data = await response.json();

      if (data.items) {
        setRecipients(data.items);
        setRecipientsTotal(data.total);
      } else {
        setRecipients(data);
        setRecipientsTotal(data.length);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRecipientsLoading(false);
    }
  };

  const fetchExistingUsers = async () => {
    setExistingUsersLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setExistingUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExistingUsersLoading(false);
    }
  };

  useEffect(() => {
    if (showCreateModal && addRecipientTab === "existing") {
      fetchExistingUsers();
    }
  }, [showCreateModal, addRecipientTab]);

  const handleEdit = async (recipient: Recipient) => {
    setError("");
    setEditingRecipient(recipient);
    setFormData({
      name: recipient.name || "",
      email: recipient.email || "",
      phone: recipient.phone || "",
      preference: recipient.preference,
      buildingId: formData.buildingId,
      buildingIds: [],
      password: "",
      confirmPassword: "",
    });
    setEditBuildingIds([]);
    setShowEditModal(true);
    setEditLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/recipients/${recipient.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setEditBuildingIds(data.buildingIds || []);
        setFormData((prev) => ({ ...prev, buildingIds: data.buildingIds || [] }));
      } else if (selectedBuilding) {
        setEditBuildingIds([selectedBuilding]);
        setFormData((prev) => ({ ...prev, buildingIds: [selectedBuilding] }));
      }
    } catch {
      if (selectedBuilding) {
        setEditBuildingIds([selectedBuilding]);
        setFormData((prev) => ({ ...prev, buildingIds: [selectedBuilding] }));
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipient) return;
    setEditModalError("");

    const ids = formData.buildingIds.length > 0 ? formData.buildingIds : editBuildingIds;
    if (ids.length === 0) {
      setEditModalError("Please select at least one building.");
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setEditModalError("Invalid email address.");
      return;
    }
    if (formData.phone && !/^\+?[1-9]\d{9,14}$/.test(formData.phone.replace(/[\s\-().]/g, ""))) {
      setEditModalError("Invalid phone number. Use format: +12223334444");
      return;
    }

    setUpdateLoading(true);
    try {
      const token = localStorage.getItem("token");
      const body: Record<string, unknown> = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        preference: formData.preference,
        buildingIds: ids,
      };

      const response = await fetch(`/api/recipients/${editingRecipient.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data?.message === "string" ? data.message : "Failed to update recipient");
      }

      setShowEditModal(false);
      setEditingRecipient(null);
      setFormData({ name: "", email: "", phone: "", preference: "email", buildingId: "", buildingIds: [], password: "", confirmPassword: "" });
      setToast("Recipient updated successfully.");
      fetchRecipients();
    } catch (err: any) {
      setEditModalError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteClick = (recipient: Recipient) => {
    setDeleteTarget(recipient);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      const token = localStorage.getItem("token");
      const url = new URL(`/api/recipients/${deleteTarget.id}`, window.location.origin);
      if (selectedBuilding) url.searchParams.set("buildingId", selectedBuilding);
      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete recipient");
      setDeleteTarget(null);
      fetchRecipients();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateModalError("");
    const ids = formData.buildingIds.length > 0 ? formData.buildingIds : (formData.buildingId ? [formData.buildingId] : []);
    if (ids.length === 0) {
      setCreateModalError("Please select at least one building.");
      return;
    }

    const isExisting = addRecipientTab === "existing" && selectedExistingUserId;
    let name = formData.name;
    let email = formData.email || null;
    let phone = formData.phone || null;
    let preference = formData.preference;

    if (isExisting) {
      const user = existingUsers.find((u) => u.id === selectedExistingUserId);
      if (!user) {
        setError("Please select an existing user");
        return;
      }
      name = user.name || "";
      email = user.email;
      phone = user.phone || null;
      preference = user.preference || "email";
    } else {
      if (!formData.email && !formData.phone) {
        setCreateModalError("Email or phone is required.");
        return;
      }
      if (formData.phone && !/^\+?[1-9]\d{9,14}$/.test(formData.phone.replace(/[\s\-().]/g, ""))) {
        setCreateModalError("Invalid phone number. Use format: +12223334444");
        return;
      }
      if (formData.password && formData.password !== formData.confirmPassword) {
        setCreateModalError("Passwords do not match.");
        return;
      }
      if (formData.password && formData.password.length < 6) {
        setCreateModalError("Password must be at least 6 characters.");
        return;
      }
      if (formData.password && !formData.email?.trim()) {
        setCreateModalError("Email is required when setting building portal password.");
        return;
      }
    }

    setCreateLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setCreateLoading(false);
        return;
      }

      const response = await fetch("/api/recipients", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buildingIds: ids,
          name,
          email,
          phone,
          preference,
          ...(!isExisting && formData.password ? { password: formData.password } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create recipient");
      }

      setShowCreateModal(false);
      setFormData({ name: "", email: "", phone: "", preference: "email", buildingId: "", buildingIds: [], password: "", confirmPassword: "" });
      setAddRecipientTab("new");
      setSelectedExistingUserId("");
      setToast("Recipient added successfully.");
      fetchRecipients();
    } catch (err: any) {
      setCreateModalError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRemoveSearch = async () => {
    if (!removeValue.trim()) return;
    setRemoveSearching(true);
    setRemoveResults(null);
    setRemoveDone(false);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("/api/admin/remove-contact", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone: removeValue.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setRemoveResults(data);
      } else {
        setRemoveResults({ found: false, matches: [], totalBuildings: 0 });
      }
    } catch {
      setRemoveResults({ found: false, matches: [], totalBuildings: 0 });
    } finally {
      setRemoveSearching(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removeResults?.found) return;
    setRemoveConfirming(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("/api/admin/remove-contact", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone: removeValue.trim(), confirm: true }),
      });
      if (res.ok) {
        setRemoveDone(true);
        if (selectedBuilding) fetchRecipients();
      }
    } catch {
      // ignore
    } finally {
      setRemoveConfirming(false);
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recipients</h1>
          <p className="mt-1 text-sm text-gray-800">
            Manage message recipients for buildings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700 whitespace-nowrap">Building:</label>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="max-w-[220px] border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 truncate"
          >
            <option value="">All Buildings</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id} className="text-gray-900 bg-white">
                {building.name} - {building.cityName}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const current = selectedBuilding || buildings[0]?.id || "";
              setFormData({
                name: "",
                email: "",
                phone: "",
                preference: "email",
                buildingId: current,
                buildingIds: current ? [current] : [],
                password: "",
                confirmPassword: "",
              });
              setAddRecipientTab("new");
              setSelectedExistingUserId("");
              setShowCreateModal(true);
            }}
            disabled={!selectedBuilding}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Recipient
          </button>
          <button
            onClick={() => {
              setRemoveValue("");
              setRemoveResults(null);
              setRemoveDone(false);
              setShowRemoveModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-50 hover:bg-red-100"
          >
            Remove Contact
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          {recipientsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : recipients.length === 0 ? (
            <div className="p-8 text-center text-gray-700 bg-gray-50">
              <p className="font-medium">
                No recipients found{selectedBuilding ? " for this building" : ""}.
              </p>
              {selectedBuilding && (
                <p className="text-sm mt-1">Click &quot;+ Add Recipient&quot; to create one.</p>
              )}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{recipient.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{recipient.email || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{recipient.phone || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800"><span className="capitalize">{recipient.preference}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${recipient.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {recipient.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleEdit(recipient)} className="p-1.5 text-blue-600 hover:text-blue-900 rounded hover:bg-blue-50" title="Edit"><IconEdit /></button>
                      <button type="button" onClick={() => handleDeleteClick(recipient)} className="p-1.5 text-red-600 hover:text-red-900 rounded hover:bg-red-50" title="Delete"><IconDelete /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
          {!selectedBuilding && recipientsTotal > recipientsLimit && (
            <div className="px-4 py-3 border-t border-gray-200">
              <PaginationBar
                page={recipientsPage}
                limit={recipientsLimit}
                total={recipientsTotal}
                onPageChange={setRecipientsPage}
                onLimitChange={(l) => {
                  setRecipientsLimit(l);
                  setRecipientsPage(1);
                }}
                itemLabel="recipients"
              />
            </div>
          )}
          </div>


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
                  {createModalError && (
                    <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
                      {createModalError}
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">
                        Building(s)
                      </label>
                      <p className="text-xs text-gray-600 mb-2">
                        Select one or more buildings. Same email = one person; they will receive alerts for all selected buildings and can use the building portal for each.
                      </p>
                      <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto bg-gray-50">
                        {buildings.map((building) => (
                          <label key={building.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.buildingIds.includes(building.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, buildingIds: [...formData.buildingIds, building.id] });
                                } else {
                                  setFormData({ ...formData, buildingIds: formData.buildingIds.filter((id) => id !== building.id) });
                                }
                              }}
                              className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-900">{building.name} – {building.cityName}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Tabs: Add existing user | Add new user */}
                    <div className="flex gap-2 border-b border-gray-200">
                      <button
                        type="button"
                        onClick={() => setAddRecipientTab("existing")}
                        className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px ${addRecipientTab === "existing" ? "border-blue-600 text-blue-700 bg-blue-50" : "border-transparent text-gray-600 hover:text-gray-900"}`}
                      >
                        Add existing user
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddRecipientTab("new")}
                        className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px ${addRecipientTab === "new" ? "border-blue-600 text-blue-700 bg-blue-50" : "border-transparent text-gray-600 hover:text-gray-900"}`}
                      >
                        Add new user
                      </button>
                    </div>

                    {addRecipientTab === "existing" ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">
                          Select user
                        </label>
                        <p className="text-xs text-gray-600 mb-2">
                          Assign this user to the selected building(s). They will receive alerts and can use the building portal for each.
                        </p>
                        {existingUsersLoading ? (
                          <p className="text-sm text-gray-500">Loading users…</p>
                        ) : (
                          <select
                            value={selectedExistingUserId}
                            onChange={(e) => setSelectedExistingUserId(e.target.value)}
                            className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Choose a user…</option>
                            {existingUsers.map((u) => (
                              <option key={u.id} value={u.id} className="text-gray-900 bg-white">
                                {u.email} {u.name ? `(${u.name})` : ""}
                              </option>
                            ))}
                          </select>
                        )}
                        {existingUsers.length === 0 && !existingUsersLoading && (
                          <p className="text-sm text-amber-700 mt-1">No building users yet. Use &quot;Add new user&quot; to create one.</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-1">Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Recipient name"
                            className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-1">Email</label>
                          <input
                            type="email"
                            placeholder="email@example.com"
                            className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600">Optional: building portal login (email + password above)</p>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-0.5">Password</label>
                            <input
                              type="password"
                              placeholder="Min 6 characters"
                              autoComplete="new-password"
                              className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-0.5">Confirm password</label>
                            <input
                              type="password"
                              placeholder="Repeat password"
                              autoComplete="new-password"
                              className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-1">Phone</label>
                          <p className="text-xs text-amber-700 mb-1">Use the recipient&apos;s personal phone (not your Twilio sender number)</p>
                          <input
                            type="tel"
                            placeholder="+1234567890"
                            className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-1">Communication Preference</label>
                          <select
                            className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={formData.preference}
                            onChange={(e) => setFormData({ ...formData, preference: e.target.value as "email" | "sms" | "both" })}
                          >
                            <option value="email" className="text-gray-900 bg-white">Email</option>
                            <option value="sms" className="text-gray-900 bg-white">SMS</option>
                            <option value="both" className="text-gray-900 bg-white">Both</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={createLoading}
                    className="px-4 py-2 border-2 border-gray-400 rounded-md text-gray-800 bg-white font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createLoading ? "Creating…" : "Create"}
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
              <form onSubmit={handleUpdate} noValidate>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Edit Recipient
                  </h3>
                  {editModalError && (
                    <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
                      {editModalError}
                    </div>
                  )}
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
                    disabled={updateLoading}
                    className="px-4 py-2 border-2 border-gray-400 rounded-md text-gray-800 bg-white font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateLoading ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Remove Contact Modal */}
      {showRemoveModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-80" onClick={() => setShowRemoveModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full border-2 border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {removeDone ? "Contact Removed" : "Remove Contact"}
              </h3>

              {removeDone ? (
                <div>
                  <div className="rounded-md bg-green-50 p-4 mb-4">
                    <p className="text-sm font-medium text-green-800">
                      Contact has been deactivated from all buildings.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowRemoveModal(false)}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter an email or phone number to find and remove from all buildings.
                  </p>
                  <input
                    type="text"
                    placeholder="email@example.com or +1234567890"
                    className="block w-full border-2 border-gray-400 rounded-md py-2 px-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                    value={removeValue}
                    onChange={(e) => {
                      setRemoveValue(e.target.value);
                      setRemoveResults(null);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRemoveSearch(); }}
                  />

                  {removeSearching && (
                    <p className="text-sm text-gray-500 mb-4">Searching...</p>
                  )}

                  {removeResults && !removeResults.found && !removeSearching && (
                    <div className="rounded-md bg-amber-50 p-3 mb-4">
                      <p className="text-sm text-amber-800">No contacts found with that email or phone.</p>
                    </div>
                  )}

                  {removeResults && removeResults.found && (
                    <div className="mb-4">
                      <div className="rounded-md bg-blue-50 p-3 mb-3">
                        <p className="text-sm font-medium text-blue-800">
                          Found in {removeResults.totalBuildings} building{removeResults.totalBuildings !== 1 ? "s" : ""}:
                        </p>
                      </div>
                      {removeResults.matches.map((match, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-md p-3 mb-2 bg-gray-50">
                          <p className="text-sm font-medium text-gray-900">
                            {match.email || "—"}
                          </p>
                          {match.phone && (
                            <p className="text-sm text-gray-600 mt-0.5">
                              Phone: {match.phone}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Buildings: {match.buildings.map((b) => b.name).join(", ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowRemoveModal(false)}
                      className="px-4 py-2 border-2 border-gray-400 rounded-md text-gray-800 bg-white font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    {!removeResults && !removeSearching && (
                      <button
                        onClick={handleRemoveSearch}
                        disabled={!removeValue.trim()}
                        className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        Continue
                      </button>
                    )}
                    {removeSearching && (
                      <button disabled className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium opacity-50">
                        Searching...
                      </button>
                    )}
                    {removeResults?.found && !removeSearching && (
                      <button
                        onClick={handleRemoveConfirm}
                        disabled={removeConfirming}
                        className="px-4 py-2 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        {removeConfirming ? "Removing..." : "Remove from all buildings"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete recipient"
        message="Are you sure you want to delete this recipient?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
