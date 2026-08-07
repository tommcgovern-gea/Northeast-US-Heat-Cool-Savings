"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preference, setPreference] = useState("email");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const payload = JSON.parse(atob(token.split(".")[1]));
    fetch("/api/buildings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(async () => {
        const me = await fetch("/api/building/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (me.ok) {
          const data = await me.json();
          setEmail(data.user?.email || "");
          setPhone(data.user?.phone || "");
          setPreference(data.user?.preference || "email");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if ((preference === "sms" || preference === "both") && !phone.trim()) {
      setError("Phone number is required for SMS or Both communication preference");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("/api/building/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() || null, preference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");
      setSuccess("Profile updated successfully");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Account Settings</h1>
        <p className="text-sm text-gray-500 mb-6">Update your email, phone number, and communication preference</p>

        {success && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 mb-4">
            <p className="text-sm font-medium text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 mb-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-800">Email</label>
            <input
              id="email"
              type="email"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-800">Phone number</label>
            <input
              id="phone"
              type="tel"
              required={preference === "sms" || preference === "both"}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {(preference === "sms" || preference === "both") && !phone.trim() && (
              <p className="mt-1 text-xs text-amber-700">Phone number is required for SMS.</p>
            )}
            {(!preference || preference === "email") && (
              <p className="mt-1 text-xs text-gray-500">Format: +1234567890</p>
            )}
          </div>

          <div>
            <label htmlFor="preference" className="block text-sm font-medium text-gray-800">Communication preference</label>
            <select
              id="preference"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="both">Both (email and SMS)</option>
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
