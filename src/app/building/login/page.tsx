"use client";

import { useState, Suspense } from "react";
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

type Mode = "login" | "signup";

function BuildingLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const initialMode =
    justRegistered || searchParams.get("mode") !== "signup" ? "login" : "signup";
  const [mode, setMode] = useState<Mode>(initialMode);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState(() => searchParams.get("email")?.trim() ?? "");
  const [password, setPassword] = useState("");

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = accessCode.trim();
    if (!code) return;
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-access-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      let data: { message?: string; onboardingToken?: string } = {};
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          data = { message: "Invalid response from server" };
        }
      } else {
        data = {
          message:
            response.status === 401
              ? "Invalid or already used access code."
              : "Verification failed.",
        };
      }

      if (!response.ok || !data.onboardingToken) {
        throw new Error(
          data.message ||
            (response.status === 401
              ? "Invalid or already used access code."
              : "Verification failed."),
        );
      }

      sessionStorage.setItem("onboardingToken", data.onboardingToken);
      sessionStorage.setItem("onboardingAccessCode", code);
      router.push("/building/signup");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Invalid or already used access code.",
      );
    } finally {
      setLoading(false);
    }
  };

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

  const title = mode === "login" ? "Welcome back" : "Request access";
  const subtitle =
    mode === "login"
      ? "Enter your credentials to access the building portal."
      : "Enter your access code to begin registration.";

  return (
    <PortalShell title={title} subtitle={subtitle}>
      {justRegistered && mode === "login" && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-semibold">Details saved successfully</p>
          <p className="mt-1 text-green-700">
            Sign in below with your email and your access code (the same code you
            used to register).
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {mode === "login" ? (
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
                placeholder="Your access code"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
              />
              <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
            </div>
            {justRegistered && (
              <p className="text-xs text-gray-600">
                Password is your access code from registration, not your email password.
              </p>
            )}
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
            <button type="button" onClick={() => switchMode("signup")} className={linkClass}>
              Sign up
            </button>
          </p>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={handleSignup}>
          <div>
            <label htmlFor="access-code" className={labelClass}>
              Access code
            </label>
            <div className="relative">
              <input
                id="access-code"
                name="access-code"
                type={showPassword ? "text" : "password"}
                autoComplete="off"
                className={inputClass + " pr-11"}
                placeholder="Enter your code"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value);
                  setError("");
                }}
              />
              <PasswordToggle
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                labelHide="Hide code"
                labelShow="Show code"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !accessCode.trim()}
            className={primaryBtnClass}
          >
            {loading ? "Verifying..." : "Continue"}
          </button>

          <p className="text-center text-sm text-gray-800">
            Already have an account?{" "}
            <button type="button" onClick={() => switchMode("login")} className={linkClass}>
              Sign in
            </button>
          </p>
        </form>
      )}

      <p className="mt-8 text-center">
        <span className={portalBadgeClass}>View-only access portal</span>
      </p>
    </PortalShell>
  );
}

function PasswordToggle({
  show,
  onToggle,
  labelHide = "Hide password",
  labelShow = "Show password",
}: {
  show: boolean;
  onToggle: () => void;
  labelHide?: string;
  labelShow?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
      aria-label={show ? labelHide : labelShow}
    >
      {show ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-10-7a17.3 17.3 0 013.05-4.95M9.88 9.88a3 3 0 104.24 4.24M6.1 6.1L3 3m18 18l-3.1-3.1" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
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
