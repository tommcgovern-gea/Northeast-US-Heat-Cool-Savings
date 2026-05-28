"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const ONBOARDING_TOKEN_KEY = "onboardingToken";
const ONBOARDING_CODE_KEY = "onboardingAccessCode";

export function BuildingAccessForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  const handleContinue = async (e: React.FormEvent) => {
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
      if (response.headers.get("content-type")?.includes("application/json")) {
        data = await response.json();
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

      sessionStorage.setItem(ONBOARDING_TOKEN_KEY, data.onboardingToken);
      sessionStorage.setItem(ONBOARDING_CODE_KEY, code);
      router.push("/building/signup");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Invalid or already used access code.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalShell
      title="Request access"
      subtitle="Enter your access code to begin registration."
    >
      {error && (
        <div className="mb-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleContinue}>
        <div>
          <label htmlFor="access-code" className={labelClass}>
            Access code
          </label>
          <div className="relative">
            <input
              id="access-code"
              name="access-code"
              type={showCode ? "text" : "password"}
              autoComplete="off"
              required
              className={inputClass + " pr-11"}
              placeholder="Enter your code"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value);
                setError("");
              }}
            />
            <PasswordToggle
              show={showCode}
              onToggle={() => setShowCode(!showCode)}
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
          Already registered on the portal?{" "}
          <Link href="/building/login" className={linkClass}>
            Sign in here
          </Link>
        </p>
      </form>

      <p className="mt-8 text-center">
        <span className={portalBadgeClass}>View-only access portal</span>
      </p>
    </PortalShell>
  );
}
