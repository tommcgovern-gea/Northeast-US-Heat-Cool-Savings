"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  PortalShell,
  inputClass,
  labelClass,
  primaryBtnClass,
  linkClass,
  portalBadgeClass,
} from "@/components/portal/PortalShell";
import { PasswordToggle } from "@/components/portal/PasswordToggle";

function BuildingLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(() => searchParams.get("email")?.trim() ?? "");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      router.replace("/building/access");
    }
  }, [searchParams, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      let data: { message?: string; token?: string; role?: string } = {};
      if (response.headers.get("content-type")?.includes("application/json")) {
        data = await response.json();
      }

      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password.");
      }

      if (data.role !== "BUILDING") {
        throw new Error("Access denied. This portal is for building users only.");
      }

      sessionStorage.removeItem("onboardingToken");
      sessionStorage.removeItem("onboardingAccessCode");
      localStorage.setItem("token", data.token!);
      router.push("/building");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalShell
      title="Welcome back"
      subtitle="Enter your credentials to access the building portal."
    >
      {justRegistered && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-semibold">Registration complete</p>
          <p className="mt-1 text-green-700">
            Sign in below with your email and the password you created during
            registration.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleLogin}>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            placeholder="name@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className={labelClass + " mb-0"}>
              Password
            </label>
            <Link href="/forgot-password" className={linkClass}>
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className={inputClass + " pr-11"}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
            />
            <PasswordToggle
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          className={primaryBtnClass}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-center text-sm text-gray-800">
          Don&apos;t have an account?{" "}
          <Link href="/building/access" className={linkClass}>
            Enter access code
          </Link>
        </p>
      </form>

      <p className="mt-8 text-center">
        <span className={portalBadgeClass}>View-only access portal</span>
      </p>
    </PortalShell>
  );
}

export default function BuildingLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      }
    >
      <BuildingLoginContent />
    </Suspense>
  );
}
