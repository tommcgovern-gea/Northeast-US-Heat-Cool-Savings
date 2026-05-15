"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingStepper } from "@/components/building/OnboardingStepper";
import {
  PortalShell,
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
} from "@/components/portal/PortalShell";

const selectClass =
  "block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const readOnlyFieldClass =
  "block w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700 cursor-default pointer-events-none hover:border-gray-200 focus:border-gray-200 focus:ring-0 focus:outline-none";

type Step = "profile" | "city" | "building";

interface CityOption {
  id: string;
  name: string;
  state: string;
  nwsOffice?: string;
  nwsGridX?: number;
  nwsGridY?: number;
}

interface BuildingOption {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
}

const ONBOARDING_TOKEN_KEY = "onboardingToken";
const ONBOARDING_CODE_KEY = "onboardingAccessCode";

export default function BuildingSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("profile");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [onboardingToken, setOnboardingToken] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    preference: "email" as "email" | "sms" | "both",
  });

  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [showCityModal, setShowCityModal] = useState(false);
  const [cityForm, setCityForm] = useState({
    name: "",
    state: "",
    nwsOffice: "",
    nwsGridX: "",
    nwsGridY: "",
    alertTempDelta: "5",
    alertWindowHours: "6",
  });
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [cityModalError, setCityModalError] = useState("");
  const [citySuccessMessage, setCitySuccessMessage] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const initDone = useRef(false);
  const onboardingTokenRef = useRef("");

  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [buildingMode, setBuildingMode] = useState<"select" | "new">("select");
  const [newBuilding, setNewBuilding] = useState({ name: "", address: "" });
  const [pendingNewCity, setPendingNewCity] = useState<typeof cityForm | null>(null);

  const authHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    const token = sessionStorage.getItem(ONBOARDING_TOKEN_KEY);
    const code = sessionStorage.getItem(ONBOARDING_CODE_KEY);
    if (!token || !code) {
      router.replace("/building/login");
      return;
    }
    onboardingTokenRef.current = token;
    setOnboardingToken(token);
    setAccessCode(code);
    loadCities(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCities = async (token: string) => {
    try {
      const res = await fetch("/api/building/onboarding/cities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCities(await res.json());
    } catch {
      /* ignore */
    }
  };

  const loadBuildings = async (token: string, cityId: string) => {
    const res = await fetch(
      `/api/building/onboarding/buildings?cityId=${encodeURIComponent(cityId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) setBuildings(await res.json());
    else setBuildings([]);
  };

  const handleCitySearch = useCallback((query: string) => {
    setCityForm((prev) => ({ ...prev, name: query }));
    if (query.length < 1) {
      setCitySuggestions([]);
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
          const data = await res.json();
          const seen = new Set<string>();
          setCitySuggestions(
            (data as any[]).filter((s) => {
              const key = s.displayName || s.name;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            }),
          );
        } else {
          setCitySuggestions([]);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setCitySuggestions([]);
      } finally {
        if (!controller.signal.aborted) setCitySearching(false);
      }
    }, 300);
  }, []);

  const selectCitySuggestion = (s: {
    name: string;
    state: string;
    nwsOffice: string;
    nwsGridX: number;
    nwsGridY: number;
  }) => {
    setCityForm((prev) => ({
      ...prev,
      name: s.name,
      state: s.state,
      nwsOffice: s.nwsOffice,
      nwsGridX: String(s.nwsGridX),
      nwsGridY: String(s.nwsGridY),
    }));
    setCitySuggestions([]);
    setCitySearching(false);
  };

  const closeCityModal = () => {
    searchAbortRef.current?.abort();
    setCitySuggestions([]);
    setCitySearching(false);
    setShowCityModal(false);
    setCityModalError("");
  };

  const validateProfile = () => {
    if (!profile.name.trim()) {
      setError("Name is required.");
      return false;
    }
    if (!profile.email.trim()) {
      setError("Email is required.");
      return false;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(profile.email.trim())) {
      setError("Enter a valid email address.");
      return false;
    }
    if (profile.phone.trim()) {
      const phoneRe = /^\+?[1-9]\d{9,14}$/;
      if (!phoneRe.test(profile.phone.trim())) {
        setError("Phone must be in E.164 format (e.g. +1234567890).");
        return false;
      }
    }
    return true;
  };

  const handleProfileContinue = () => {
    setError("");
    if (!validateProfile()) return;
    setStep("city");
  };

  const selectedCity = cities.find((c) => c.id === selectedCityId);

  const handleCityContinue = () => {
    setError("");
    if (!selectedCityId && !pendingNewCity) {
      setError("Select a city or add a new one.");
      return;
    }
    setStep("building");
    const cityId = selectedCityId;
    if (cityId && onboardingToken) loadBuildings(onboardingToken, cityId);
    else setBuildings([]);
  };

  useEffect(() => {
    if (step !== "building" || !selectedCityId || !onboardingToken) return;
    loadBuildings(onboardingToken, selectedCityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedCityId]);

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCityModalError("");
    if (!cityForm.nwsOffice.trim() || !cityForm.nwsGridX || !cityForm.nwsGridY) {
      setCityModalError("Search a city to auto-fill NWS fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/building/onboarding/cities", {
        method: "POST",
        headers: authHeaders(onboardingToken),
        body: JSON.stringify({
          name: cityForm.name,
          state: cityForm.state,
          nwsOffice: cityForm.nwsOffice,
          nwsGridX: parseInt(cityForm.nwsGridX, 10),
          nwsGridY: parseInt(cityForm.nwsGridY, 10),
          alertTempDelta: parseFloat(cityForm.alertTempDelta),
          alertWindowHours: parseInt(cityForm.alertWindowHours, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add city");

      const added: CityOption = {
        id: data.id,
        name: data.name,
        state: data.state,
      };
      setCities((prev) =>
        prev.some((c) => c.id === added.id) ? prev : [...prev, added],
      );
      setSelectedCityId(data.id);
      setPendingNewCity(null);
      setCitySuccessMessage(
        data.existing
          ? `${added.name}, ${added.state} is already in the system and has been selected.`
          : `${added.name}, ${added.state} was added and is ready to continue.`,
      );
      setCityForm({
        name: "",
        state: "",
        nwsOffice: "",
        nwsGridX: "",
        nwsGridY: "",
        alertTempDelta: "5",
        alertWindowHours: "6",
      });
      closeCityModal();
      await loadCities(onboardingToken);
    } catch (err: any) {
      setCityModalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setError("");
    const cityId = selectedCityId || undefined;
    const newCityPayload =
      !cityId && pendingNewCity
        ? {
            name: pendingNewCity.name,
            state: pendingNewCity.state,
            nwsOffice: pendingNewCity.nwsOffice,
            nwsGridX: parseInt(pendingNewCity.nwsGridX, 10),
            nwsGridY: parseInt(pendingNewCity.nwsGridY, 10),
            alertTempDelta: parseFloat(pendingNewCity.alertTempDelta),
            alertWindowHours: parseInt(pendingNewCity.alertWindowHours, 10),
          }
        : null;

    if (!cityId && !newCityPayload) {
      setError("City is required.");
      return;
    }

    let buildingId = selectedBuildingId || undefined;
    let newBuildingPayload = null;
    if (buildingMode === "new") {
      if (!newBuilding.name.trim() || !newBuilding.address.trim()) {
        setError("Building name and address are required.");
        return;
      }
      newBuildingPayload = {
        name: newBuilding.name.trim(),
        address: newBuilding.address.trim(),
      };
      buildingId = undefined;
    } else if (!buildingId) {
      setError("Select a building or add a new one.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/building/onboarding/complete", {
        method: "POST",
        headers: authHeaders(onboardingToken),
        body: JSON.stringify({
          accessCode,
          name: profile.name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim() || null,
          preference: profile.preference,
          cityId,
          newCity: newCityPayload,
          buildingId,
          newBuilding: newBuildingPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      sessionStorage.removeItem(ONBOARDING_TOKEN_KEY);
      sessionStorage.removeItem(ONBOARDING_CODE_KEY);
      const registeredEmail = encodeURIComponent(profile.email.trim());
      router.push(`/building/login?registered=1&email=${registeredEmail}`);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (!onboardingToken) {
    return (
      <div>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  const stepSubtitle =
    step === "profile"
      ? "Tell us how to reach you."
      : step === "city"
        ? "Choose your city or add a new one."
        : "Select or add your building.";

  return (
    <PortalShell
      title="Complete registration"
      subtitle={stepSubtitle}
      maxWidth="lg"
      backHref="/building/login"
      backLabel="Back to login"
    >
      <OnboardingStepper current={step} />

      {error && (
        <div className="rounded-md bg-red-50 p-4 mt-6">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      {step === "profile" && (
        <div className="mt-8 space-y-4">
          <div>
            <label htmlFor="name" className="sr-only">
              Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Name"
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email address"
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={profile.email}
              onChange={(e) =>
                setProfile({ ...profile, email: e.target.value })
              }
            />
          </div>
          <div>
            <label htmlFor="phone" className="sr-only">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="Phone (+1234567890)"
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={profile.phone}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
            />
          </div>
          <div>
            <label
              htmlFor="preference"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Communication preference
            </label>
            <select
              id="preference"
              className="block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={profile.preference}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  preference: e.target.value as "email" | "sms" | "both",
                })
              }
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="both">Both</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleProfileContinue}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Continue
          </button>
        </div>
      )}

      {step === "city" && (
        <div className="mt-8 space-y-6">
          {selectedCity ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-900">City selected</p>
              <p className="mt-1 text-base font-medium text-green-800">
                {selectedCity.name}, {selectedCity.state}
              </p>
              {citySuccessMessage && (
                <p className="mt-2 text-xs text-green-700">{citySuccessMessage}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedCityId("");
                  setCitySuccessMessage("");
                  setPendingNewCity(null);
                }}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Change city
              </button>
            </div>
          ) : (
            <>
            <div>
              <p className={labelClass}>Cities available</p>
              <p className="mb-2 text-xs text-gray-600">
                Select a city already configured in the system.
              </p>
              <select
                id="city"
                className={selectClass}
                value={selectedCityId}
                onChange={(e) => {
                  setSelectedCityId(e.target.value);
                  setPendingNewCity(null);
                  setCitySuccessMessage("");
                }}
              >
                <option value="">Choose a city...</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}, {c.state}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-md border border-gray-200 bg-white p-4">
              <p className={labelClass}>Add a new city</p>
              <p className="mb-3 text-xs text-gray-600">
                Don&apos;t see your city? Add it here and it will be selected
                automatically.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCityModalError("");
                  setShowCityModal(true);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                + Add city
              </button>
            </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("profile")}
              className={`${secondaryBtnClass} flex-1`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCityContinue}
              className={`${primaryBtnClass} flex-1`}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "building" && (
        <div className="mt-8 space-y-4">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={buildingMode === "select"}
                onChange={() => setBuildingMode("select")}
              />
              <p className="text-sm font-medium text-gray-700">Existing building</p>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={buildingMode === "new"}
                onChange={() => setBuildingMode("new")}
              />
              <p className="text-sm font-medium text-gray-700">New building</p>
            </label>
          </div>

          {buildingMode === "select" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Building
              </label>
              {buildings.length === 0 ? (
                <p className="text-sm text-gray-600 mb-2">
                  No buildings in this city yet. Please add a new building.
                </p>
              ) : (
                <select
                  className="block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                >
                  <option value="">Choose a building...</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.address}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Company / building name"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm"
                value={newBuilding.name}
                onChange={(e) =>
                  setNewBuilding({ ...newBuilding, name: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Address"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm"
                value={newBuilding.address}
                onChange={(e) =>
                  setNewBuilding({ ...newBuilding, address: e.target.value })
                }
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("city")}
              disabled={loading}
              className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={loading}
              className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
        </div>
      )}

      {showCityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-gray-500 bg-opacity-75"
            onClick={closeCityModal}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add City
            </h3>
            {cityModalError && (
              <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
                {cityModalError}
              </div>
            )}
            <form onSubmit={handleAddCity} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search city
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={cityForm.name}
                  onChange={(e) => handleCitySearch(e.target.value)}
                  placeholder="Type city name..."
                />
                {citySearching && (
                  <p className="text-xs text-gray-500 mt-1">Searching...</p>
                )}
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
              <div className="grid grid-cols-2 gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="col-span-2 text-xs text-gray-500">
                  Filled automatically when you pick a city from search.
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-600">State</label>
                  <input
                    type="text"
                    className={readOnlyFieldClass}
                    value={cityForm.state}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    NWS Office
                  </label>
                  <input
                    type="text"
                    className={readOnlyFieldClass}
                    value={cityForm.nwsOffice}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Grid X</label>
                  <input
                    type="text"
                    className={readOnlyFieldClass}
                    value={cityForm.nwsGridX}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Grid Y</label>
                  <input
                    type="text"
                    className={readOnlyFieldClass}
                    value={cityForm.nwsGridY}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCityModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Adding..." : "Add city"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalShell>
  );
}