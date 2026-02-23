"use client";

import { useState } from "react";

interface SearchBarProps {
    onSearch: (city: string) => void;
    isLoading: boolean;
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
    const [query, setQuery] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            setError("Please enter a city name");
            return;
        }

        if (trimmedQuery.length < 2) {
            setError("Minimum 2 characters required");
            return;
        }

        setError(null);
        onSearch(trimmedQuery);
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="relative group">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (error) setError(null);
                    }}
                    disabled={isLoading}
                    placeholder="Enter city name..."
                    className={`w-full px-5 py-3 pr-12 rounded-2xl border ${error ? "border-red-400 focus:ring-red-500" : "border-slate-200 focus:ring-blue-500"
                        } bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm group-hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed`}
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-5 h-5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                            />
                        </svg>
                    )}
                </button>
            </form>
            {error && (
                <p className="mt-2 ml-2 text-sm text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
                    {error}
                </p>
            )}
        </div>
    );
}
