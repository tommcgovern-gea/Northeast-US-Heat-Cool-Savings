"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PortalShell,
  inputClass,
  labelClass,
  primaryBtnClass,
} from "@/components/portal/PortalShell";
import { PasswordToggle } from "@/components/portal/PasswordToggle";
import { BuildingSignupSuccess } from "@/components/portal/BuildingSignupSuccess";

const ONBOARDING_TOKEN_KEY = "onboardingToken";
const ONBOARDING_CODE_KEY = "onboardingAccessCode";

type Page = "form" | "success";

type CitySuggestion = {
  name: string;
  state: string;
  nwsOffice: string;
  nwsGridX: number;
  nwsGridY: number;
  displayName: string;
};

export default function BuildingSignupPage() {
  const router = useRouter();
  const initDone = useRef(false);
  const onboardingTokenRef = useRef("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const cityBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedCityRef = useRef<CitySuggestion | null>(null);
  const cityNoResultsRef = useRef(false);
  const [page, setPage] = useState<Page>("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [onboardingToken, setOnboardingToken] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    phone: "",
    buildingAddress: "",
    city: "",
    zipCode: "",
    preference: "email" as "email" | "sms" | "both",
    password: "",
    confirmPassword: "",
    reserve1: "",
    reserve2: "",
    reserve3: "",
  });
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [cityNoResults, setCityNoResults] = useState(false);
  const [cityMustSelectFromList, setCityMustSelectFromList] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CitySuggestion | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    const token = sessionStorage.getItem(ONBOARDING_TOKEN_KEY);
    const code = sessionStorage.getItem(ONBOARDING_CODE_KEY);
    if (!token || !code) {
      router.replace("/");
      return;
    }
    onboardingTokenRef.current = token;
    setOnboardingToken(token);
    setAccessCode(code);
  }, [router]);

  useEffect(() => {
    selectedCityRef.current = selectedCity;
    cityNoResultsRef.current = cityNoResults;
  }, [selectedCity, cityNoResults]);

  useEffect(() => {
    return () => {
      if (cityBlurTimer.current) clearTimeout(cityBlurTimer.current);
    };
  }, []);

  const cityFieldInvalid =
    !selectedCity && (cityNoResults || cityMustSelectFromList);

  const focusCityIfInvalid = () => {
    if (selectedCityRef.current) return false;
    setCityMustSelectFromList(true);
    requestAnimationFrame(() => document.getElementById("city")?.focus());
    return true;
  };

  const handleCitySearch = useCallback((query: string) => {
    setForm((prev) => ({ ...prev, city: query }));
    setSelectedCity(null);
    setCityNoResults(false);
    setCityMustSelectFromList(false);
    setCitySuggestions([]);

    if (query.length < 1) {
      setCitySearching(false);
      return;
    }

    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      const token = onboardingTokenRef.current;
      if (!token) return;

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      setCitySearching(true);
      try {
        const res = await fetch(
          `/api/building/onboarding/cities/search?q=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        if (controller.signal.aborted) return;
        if (res.ok) {
          const data = (await res.json()) as CitySuggestion[];
          const seen = new Set<string>();
          const filtered = data.filter((s) => {
            const key = s.displayName || s.name;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setCitySuggestions(filtered);
          setCityNoResults(filtered.length === 0);
        } else {
          setCitySuggestions([]);
          setCityNoResults(true);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setCitySuggestions([]);
        setCityNoResults(true);
      } finally {
        if (!controller.signal.aborted) setCitySearching(false);
      }
    }, 300);
  }, []);

  const handleCityBlur = () => {
    if (cityBlurTimer.current) clearTimeout(cityBlurTimer.current);
    cityBlurTimer.current = setTimeout(() => {
      setCitySuggestions([]);
      if (selectedCityRef.current) return;

      setForm((prev) => {
        if (!prev.city.trim()) return prev;
        return { ...prev, city: "" };
      });

      if (cityNoResultsRef.current) {
        setCityMustSelectFromList(false);
      } else {
        setCityMustSelectFromList(true);
      }
    }, 200);
  };

  const handleCityFocus = () => {
    if (cityBlurTimer.current) {
      clearTimeout(cityBlurTimer.current);
      cityBlurTimer.current = null;
    }
  };

  const selectCitySuggestion = (s: CitySuggestion) => {
    if (cityBlurTimer.current) {
      clearTimeout(cityBlurTimer.current);
      cityBlurTimer.current = null;
    }
    setSelectedCity(s);
    setCityNoResults(false);
    setCityMustSelectFromList(false);
    setForm((prev) => ({
      ...prev,
      city: s.displayName || `${s.name}, ${s.state}`,
    }));
    setCitySuggestions([]);
    setCitySearching(false);
  };

  const authHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedCity) {
      if (!cityNoResults && form.city.trim()) {
        setCityMustSelectFromList(true);
      }
      setError(
        cityNoResults
          ? "Please enter a valid city name."
          : "Please select your city from the search list.",
      );
      return;
    }

    if (
      form.confirmPassword &&
      form.password !== form.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    const needsPhone =
      form.preference === "sms" || form.preference === "both";
    if (needsPhone && !form.phone.trim()) {
      setError("Please enter a phone number to receive SMS.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/building/onboarding/complete", {
        method: "POST",
        headers: authHeaders(onboardingToken),
        body: JSON.stringify({
          accessCode,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          companyName: form.companyName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          buildingAddress: form.buildingAddress.trim(),
          city: form.city.trim(),
          zipCode: form.zipCode.trim(),
          citySelection: {
            name: selectedCity.name,
            state: selectedCity.state,
            nwsOffice: selectedCity.nwsOffice,
            nwsGridX: selectedCity.nwsGridX,
            nwsGridY: selectedCity.nwsGridY,
          },
          preference: form.preference,
          password: form.password,
          reserve1: form.reserve1.trim() || null,
          reserve2: form.reserve2.trim() || null,
          reserve3: form.reserve3.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      sessionStorage.removeItem(ONBOARDING_TOKEN_KEY);
      sessionStorage.removeItem(ONBOARDING_CODE_KEY);
      localStorage.setItem("token", data.token);
      setPage("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (!onboardingToken && page === "form") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const needsPhoneForSms =
    form.preference === "sms" || form.preference === "both";

  if (page === "success") {
    return (
      <PortalShell
        maxWidth="lg"
        backHref={undefined}
      >
        <BuildingSignupSuccess />
      </PortalShell>
    );
  }

  return (
    <PortalShell
      title="Your information"
      subtitle="Please complete all fields below."
      maxWidth="lg"
      backHref="/"
      backLabel="Back"
    >
      {error && (
        <div className="rounded-md bg-red-50 p-4 mt-6">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className={labelClass}>
              First name
            </label>
            <input
              id="firstName"
              required
              className={inputClass}
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>
              Last name
            </label>
            <input
              id="lastName"
              required
              className={inputClass}
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label htmlFor="companyName" className={labelClass}>
            Company name
          </label>
          <input
            id="companyName"
            required
            className={inputClass}
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass + " pr-11"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <PasswordToggle
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            required={needsPhoneForSms}
            className={inputClass}
            placeholder="+1234567890"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          {needsPhoneForSms && !form.phone.trim() && (
            <p className="mt-1 text-xs text-amber-800" role="status">
              Please enter a phone number to receive SMS.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="buildingAddress" className={labelClass}>
            Building address
          </label>
          <input
            id="buildingAddress"
            required
            className={inputClass}
            value={form.buildingAddress}
            onChange={(e) =>
              setForm({ ...form, buildingAddress: e.target.value })
            }
          />
        </div>

        <div className="space-y-4">
          <div className="relative">
            <label htmlFor="city" className={labelClass}>
              City
            </label>
            <input
              id="city"
              type="text"
              required
              autoComplete="off"
              className={
                inputClass +
                (cityFieldInvalid
                  ? " border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "")
              }
              value={form.city}
              onChange={(e) => handleCitySearch(e.target.value)}
              onFocus={handleCityFocus}
              onBlur={handleCityBlur}
              placeholder="Type city name..."
              aria-invalid={cityMustSelectFromList || cityNoResults}
              aria-describedby={
                cityMustSelectFromList || cityNoResults || citySuggestions.length > 0
                  ? "city-field-hint"
                  : undefined
              }
            />
            <div id="city-field-hint">
              {citySearching && (
                <p className="mt-1 text-xs text-gray-500">Searching...</p>
              )}
              {selectedCity && (
                <p className="mt-1 text-xs text-green-700">
                  Selected: {selectedCity.displayName}
                </p>
              )}
              {!selectedCity && !citySearching && cityNoResults && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  Please enter a valid city name.
                </p>
              )}
              {!selectedCity &&
                !citySearching &&
                !cityNoResults &&
                cityMustSelectFromList && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    Please select a city from the search list.
                  </p>
                )}
              {!selectedCity &&
                form.city.length > 0 &&
                !citySearching &&
                !cityNoResults &&
                !cityMustSelectFromList &&
                citySuggestions.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Choose a city from the list below.
                  </p>
                )}
            </div>
            {citySuggestions.length > 0 && (
              <ul
                role="listbox"
                className="absolute z-20 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg max-h-48 overflow-y-auto"
              >
                {citySuggestions.map((s) => {
                  const key = `${s.displayName}-${s.nwsOffice}-${s.nwsGridX}-${s.nwsGridY}`;
                  return (
                    <li key={key} role="option">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-sm text-gray-900 bg-white hover:bg-blue-50 border-b border-gray-100 last:border-0"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCitySuggestion(s)}
                      >
                        {s.displayName}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="zipCode" className={labelClass}>
              Zip code
            </label>
            <input
              id="zipCode"
              required
              className={inputClass}
              value={form.zipCode}
              onFocus={() => focusCityIfInvalid()}
              onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label htmlFor="preference" className={labelClass}>
            Communication preference
          </label>
          <select
            id="preference"
            required
            className={inputClass}
            value={form.preference}
            onFocus={() => focusCityIfInvalid()}
            onChange={(e) =>
              setForm({
                ...form,
                preference: e.target.value as "email" | "sms" | "both",
              })
            }
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="both">Both (email and SMS)</option>
          </select>
        </div>


        {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label htmlFor="reserve1" className="block text-xs text-gray-500">
              Reserved
            </label>
            <input
              id="reserve1"
              className={inputClass}
              value={form.reserve1}
              onChange={(e) => setForm({ ...form, reserve1: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="reserve2" className="block text-xs text-gray-500">
              Reserved
            </label>
            <input
              id="reserve2"
              className={inputClass}
              value={form.reserve2}
              onChange={(e) => setForm({ ...form, reserve2: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="reserve3" className="block text-xs text-gray-500">
              Reserved
            </label>
            <input
              id="reserve3"
              className={inputClass}
              value={form.reserve3}
              onChange={(e) => setForm({ ...form, reserve3: e.target.value })}
            />
          </div>
        </div> */}

        <div className="rounded-md bg-blue-50 border border-blue-200 p-4 mt-6">
          <p className="text-sm font-medium text-blue-900">
            To maintain eligibility for the savings guarantee, please upload a photo or BMS/BAS screenshot showing the updated setpoint within two hours of receiving an alert.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`${primaryBtnClass} mt-4`}
        >
          {loading ? "Saving..." : "Submit"}
        </button>
      </form>
    </PortalShell>
  );
}
