"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const COLLAPSED_LENGTH = 320;

type MessageView = {
  body: string;
  uploadHeading: string;
  messageType: string;
  buildingName: string;
  uploadUrl: string;
};

function MessageContent() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">(
    "loading",
  );
  const [data, setData] = useState<MessageView | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!id) {
      setStatus("invalid");
      return;
    }
    fetch(`/api/message/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.valid) {
          setData({
            body: body.body || body.content || "",
            uploadHeading: body.uploadHeading || "Upload link",
            messageType: body.messageType,
            buildingName: body.buildingName,
            uploadUrl: body.uploadUrl,
          });
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [id]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status === "invalid" || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800 max-w-md w-full">
          <h1 className="text-xl font-semibold">Message not found</h1>
          <p className="mt-2 text-sm">
            This link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  const showUpload =
    data.messageType === "alert" ||
    data.messageType === "daily_summary" ||
    data.messageType === "warning";

  const needsCollapse = data.body.length > COLLAPSED_LENGTH;
  const visibleBody =
    !needsCollapse || expanded
      ? data.body
      : `${data.body.slice(0, COLLAPSED_LENGTH).trimEnd()}…`;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-lg mx-auto bg-white shadow rounded-lg p-6">
        {data.buildingName && (
          <p className="text-sm text-gray-700 mb-4">
            Building: <span className="font-medium">{data.buildingName}</span>
          </p>
        )}

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-900 whitespace-pre-wrap wrap-break-word">
            {visibleBody}
          </p>
          {needsCollapse && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              {expanded ? "Read less" : "Read more"}
            </button>
          )}
        </div>

        {showUpload && data.uploadUrl && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-semibold text-gray-900">
              {data.uploadHeading}
            </p>
            <a
              href={data.uploadUrl}
              className="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Upload now
            </a>
            <p className="text-xs text-gray-500">Or copy this link:</p>
            <p className="text-xs text-blue-600 break-all">
              <a href={data.uploadUrl} className="hover:underline">
                {data.uploadUrl}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessageReadPage() {
  return <MessageContent />;
}
