"use client";

import { useEffect, useState } from "react";

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
  const [error, setError] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    content: "",
    subject: "",
  });

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      fetchTemplates();
    } else {
      setTemplates([]);
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

  const getDefaultTemplate = (type: string): string => {
    const defaults: Record<string, string> = {
      alert: `⚠️ SUDDEN TEMPERATURE ALERT\n\nTemperature is expected to change by {{temperatureChange}}°F in the next {{timeWindow}} hours ({{currentTemp}}°F → {{futureTemp}}°F).\n\nPlease adjust heating/cooling settings accordingly.\n\nUpload compliance photo: {{uploadUrl}}`,
      daily_summary: `📊 Daily Temperature Summary\n\nAverage: {{averageTemp}}°F\nHigh: {{maxTemp}}°F\nLow: {{minTemp}}°F\nChange from yesterday: {{temperatureChange}}°F\n\nPlease confirm your settings adjustment.\n\nUpload compliance photo: {{uploadUrl}}`,
      warning: `⚠️ COMPLIANCE WARNING\n\nYou have not uploaded a compliance photo for the message sent {{hoursAgo}} hours ago.\n\nPlease upload your photo immediately. Failure to comply may void your guarantee.\n\nUpload link: {{uploadUrl}}`,
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Message Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Customize message templates per city
          </p>
        </div>
      </div>

      {/* City Selector */}
      <div className="bg-white shadow rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select City
        </label>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a city</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}, {city.state}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">{error}</h3>
        </div>
      )}

      {selectedCity && (
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
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                            value={formData.content}
                            onChange={(e) =>
                              setFormData({ ...formData, content: e.target.value })
                            }
                          />
                          <p className="mt-2 text-xs text-gray-500">
                            Available variables: {`{{temperatureChange}}`}, {`{{timeWindow}}`}, {`{{currentTemp}}`}, {`{{futureTemp}}`}, {`{{averageTemp}}`}, {`{{minTemp}}`}, {`{{maxTemp}}`}, {`{{cityName}}`}, {`{{buildingName}}`}, {`{{uploadUrl}}`}
                          </p>
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
                          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                            {template.content}
                          </pre>
                        </div>
                        <button
                          onClick={() => handleEdit(template)}
                          className="text-sm text-blue-600 hover:text-blue-900"
                        >
                          Edit Template
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No template created. Default template will be used.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
