"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function UploadContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"idle" | "loading" | "valid" | "invalid" | "uploading" | "done" | "error">("idle");
  const [buildingName, setBuildingName] = useState("");
  const [messageType, setMessageType] = useState("");
  const [result, setResult] = useState<{ success: boolean; isCompliant?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    setStatus("loading");
    fetch(`/api/upload?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setBuildingName(data.buildingName || "");
          setMessageType(data.messageType || "");
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput?.files?.[0]) {
      setResult({ success: false, message: "Please select a photo or BMS record (image, Excel, or PDF)" });
      return;
    }
    setStatus("uploading");
    try {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("file", fileInput.files[0]);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ success: true, isCompliant: data.isCompliant, message: data.message });
        setStatus("done");
      } else {
        setResult({ success: false, message: data.message || "Upload failed" });
        setStatus("error");
      }
    } catch {
      setResult({ success: false, message: "Upload failed" });
      setStatus("error");
    }
  };

  if (status === "idle" || status === "loading") {
    return (
      <div className="min-h-[40vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-[40vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
          <h1 className="text-xl font-semibold">Invalid or expired link</h1>
          <p className="mt-2">This upload link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (status === "done" || status === "error") {
    return (
      <div className="min-h-[40vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div
          className={`rounded-lg p-6 ${
            result?.success ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <h1 className="text-xl font-semibold">{result?.success ? "Upload complete" : "Upload failed"}</h1>
          <p className="mt-2">{result?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[40vh] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-semibold text-gray-900">Upload compliance photo or BMS record</h1>
        {buildingName && (
          <p className="mt-2 text-sm text-gray-600">
            Building: <span className="font-medium">{buildingName}</span>
            {messageType && (
              <>
                {" "}
                · {messageType.replace("_", " ")}
              </>
            )}
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Photo or BMS trending record (image, Excel, or PDF, max 10MB)</label>
            <input
              type="file"
              accept="image/*,.pdf,.xlsx,.xls"
              required
              className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700"
            />
          </div>
          <button
            type="submit"
            disabled={status === "uploading"}
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {status === "uploading" ? "Uploading…" : "Upload"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[40vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    }>
      <UploadContent />
    </Suspense>
  );
}
