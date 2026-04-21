"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to request password reset.");
      }
      setMessage(
        data.message ||
          "If an account exists, a password reset link has been sent.",
      );
    } catch (err: any) {
      setError(err.message || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-800">
            Enter your email to receive a reset link.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {message && (
            <div className="rounded-md bg-green-50 p-4">
              <h3 className="text-sm font-medium text-green-800">{message}</h3>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          )}
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <div className="text-center">
              <Link href="/admin/login" className="text-sm text-blue-600 hover:text-blue-500">
                Back to Admin/Staff login
              </Link>
              <span className="mx-2 text-gray-400">|</span>
              <Link href="/building/login" className="text-sm text-blue-600 hover:text-blue-500">
                Back to Building login
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
