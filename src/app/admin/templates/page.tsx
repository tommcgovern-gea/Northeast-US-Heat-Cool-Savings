"use client";

import { useEffect, useState } from "react";
import { IconDelete, IconEdit } from "@/components/admin/ActionIcons";
import { ConfirmModal } from "@/components/ConfirmModal";

const VARIABLE_HELP = [
  {
    token: "temperatureChange",
    description: "Change in temperature (e.g. +5°F)",
  },
  {
    token: "timeWindow",
    description: "Time period for the forecast (e.g. next 24 hours)",
  },
  {
    token: "currentTemp",
    description: "Current temperature at alert time",
  },
  {
    token: "futureTemp",
    description: "Predicted temperature for the window",
  },
  {
    token: "averageTemp",
    description: "Average temperature over the period",
  },
  {
    token: "minTemp",
    description: "Minimum temperature in the period",
  },
  {
    token: "maxTemp",
    description: "Maximum temperature in the period",
  },
  {
    token: "cityName",
    description: "Name of the city",
  },
  {
    token: "buildingName",
    description: "Name of the building",
  },
  {
    token: "uploadUrl",
    description: "Link to the latest energy/photo upload",
  },
] as const;

interface Template {
  id: string;
  templateType: string;
  subject: string | null;
  content: string;
  variables: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface City {
  id: string;
  name: string;
  state: string;
}

export default function TemplatesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    content: "",
    subject: "",
  });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      setEditingTemplate(null);
      setTemplatesLoading(true);
      fetchTemplates();
    } else {
      setTemplates([]);
      setTemplatesLoading(false);
    }
  }, [selectedCity]);

  const fetchCities = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/cities", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch cities");

      const data = await response.json();
      setCities(data);
      if (data.length > 0) {
        setSelectedCity(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `/api/admin/templates?cityId=${selectedCity}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch templates");

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      content: template.content,
      subject: template.subject || "",
    });
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/admin/templates/${editingTemplate.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: formData.content,
          subject: formData.subject || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update template");
      }

      setEditingTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreate = async (templateType: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/admin/templates", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cityId: selectedCity,
          templateType,
          content: getDefaultTemplate(templateType),
          subject: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create template");
      }

      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTemplateClick = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleDeleteTemplateConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleteLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/templates/${deleteTargetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete template");
      setDeleteTargetId(null);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getDefaultTemplate = (type: string): string => {
    const defaults: Record<string, string> = {
      alert: `⚠️ SUDDEN TEMPERATURE ALERT\n\nTemperature is expected to change by {{temperatureChange}}°F in the next {{timeWindow}} hours ({{currentTemp}}°F → {{futureTemp}}°F).\n\nPlease adjust heating/cooling settings accordingly.\n\nUpload photo or BMS record: {{uploadUrl}}`,
      daily_summary: `📊 Daily Temperature Summary\n\nAverage: {{averageTemp}}°F\nHigh: {{maxTemp}}°F\nLow: {{minTemp}}°F\nChange from yesterday: {{temperatureChange}}°F\n\nPlease confirm your settings adjustment.\n\nUpload photo or BMS record: {{uploadUrl}}`,
      warning: `⚠️ COMPLIANCE WARNING\n\nYou have not uploaded compliance documentation (photo or BMS record) for the message sent {{hoursAgo}} hours ago.\n\nPlease upload immediately. Failure to comply may void your guarantee.\n\nUpload link: {{uploadUrl}}`,
    };
    return defaults[type] || "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const templateTypes = [
    { value: "alert", label: "Alert", icon: "⚠️" },
    { value: "daily_summary", label: "Daily Summary", icon: "📊" },
    { value: "warning", label: "Warning", icon: "🔔" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Message Templates</h1>
          <p className="mt-1 text-sm text-gray-800">
            Customize message templates per city
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Select City:
          </label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
          >
            <option value="">Select a city</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}, {city.state}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      {selectedCity && (
        <div className="min-h-[200px]">
          {templatesLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {templateTypes.map((type) => {
            const template = templates.find((t) => t.templateType === type.value);
            return (
              <div key={type.value} className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{type.icon}</span>
                    <h3 className="text-lg font-medium text-gray-900">
                      {type.label}
                    </h3>
                  </div>
                  {!template && (
                    <button
                      onClick={() => handleCreate(type.value)}
                      className="text-sm text-blue-600 hover:text-blue-900"
                    >
                      Create Template
                    </button>
                  )}
                </div>

                {template ? (
                  <div>
                    {editingTemplate?.id === template.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subject (optional)
                          </label>
                          <input
                            type="text"
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={formData.subject}
                            onChange={(e) =>
                              setFormData({ ...formData, subject: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Content
                          </label>
                          <textarea
                            rows={10}
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 font-mono text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={formData.content}
                            onChange={(e) =>
                              setFormData({ ...formData, content: e.target.value })
                            }
                          />
                          {(() => {
                            const usedVariables = VARIABLE_HELP.filter((v) =>
                              formData.content.includes(`{{${v.token}}}`)
                            );
                            if (usedVariables.length === 0) return null;
                            return (
                              <div className="mt-2 text-xs text-gray-800 bg-gray-50 rounded p-3 border border-gray-200">
                                <p className="font-medium text-gray-900 mb-2">
                                  Available variables in this template:
                                </p>
                                <ul className="space-y-1 list-none">
                                  {usedVariables.map((v) => (
                                    <li key={v.token}>
                                      <code className="bg-white px-1 rounded">
                                        {`{{${v.token}}}`}
                                      </code>{" "}
                                      — {v.description}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => setEditingTemplate(null)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSave}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="bg-gray-50 rounded-md p-4 mb-4">
                          <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono">
                            {template.content}
                          </pre>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(template)}
                            className="p-1.5 text-blue-600 hover:text-blue-900 rounded hover:bg-blue-50"
                            title="Edit template"
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplateClick(template.id)}
                            className="p-1.5 text-red-600 hover:text-red-900 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <IconDelete />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-800">
                    No template created. Default template will be used.
                  </p>
                )}
              </div>
            );
          })}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteTemplateConfirm}
        title="Delete template"
        message="Are you sure you want to delete this template? Default template will be used if deleted."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
