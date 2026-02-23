"use client";

import { useState, useEffect } from "react";
import SearchBar from "./components/SearchBar";
import WeatherCard, { WeatherCardSkeleton } from "./components/WeatherCard";
import ForecastCard, { ForecastCardSkeleton } from "./components/ForecastCard";
import { WeatherData, WeatherError } from "@/types/weather";

export default function WeatherPage() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<WeatherError | null>(null);

    const fetchWeather = async (city: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            setWeather(data);
        } catch (err: any) {
            setError({ message: err.message });
            setWeather(null);
        } finally {
            setLoading(false);
        }
    };

    // Fetch a default city on mount for demo/client presentation
    useEffect(() => {
        fetchWeather("London");
    }, []);

    return (
        <div className="py-10 space-y-10 max-w-6xl mx-auto px-4">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                                <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 5.106a.75.75 0 0 0-1.061 0l-1.591 1.591a.75.75 0 1 0 1.061 1.061l1.591-1.591a.75.75 0 0 0 0-1.061ZM6.182 5.106a.75.75 0 0 1 0 1.061L4.591 7.758a.75.75 0 1 1-1.061-1.061l1.591-1.591a.75.75 0 0 1 1.061 0ZM21 12a.75.75 0 0 1-.75.75H18a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 21 12ZM7.5 12a.75.75 0 0 1-.75.75H4.5a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 7.5 12ZM16.242 16.242a.75.75 0 0 0 0 1.061l1.591 1.591a.75.75 0 1 0 1.061-1.061l-1.591-1.591a.75.75 0 0 0-1.061 0ZM6.182 16.242a.75.75 0 0 1 0 1.061l-1.591 1.591a.75.75 0 1 1-1.061-1.061l1.591-1.591a.75.75 0 0 1 1.061 0ZM12 18.75a.75.75 0 0 1 .75.75V21.75a.75.75 0 0 1-1.5 0V19.5a.75.75 0 0 1 .75-.75Z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">SkyCast</h1>
                    </div>
                    <p className="text-slate-500 font-medium">Real-time precision weather analytics</p>
                </div>
                <div className="w-full md:w-96">
                    <SearchBar onSearch={fetchWeather} isLoading={loading} />
                </div>
            </header>

            {error && (
                <div className="p-8 bg-white border border-red-100 rounded-[2rem] flex flex-col items-center text-center space-y-4 shadow-xl shadow-red-50/50 animate-in fade-in zoom-in duration-300">
                    <div className="p-4 bg-red-50 rounded-2xl text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                        </svg>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-slate-900">City Not Found</h3>
                        <p className="text-slate-500 max-w-sm">{error.message}</p>
                    </div>
                    <button
                        onClick={() => fetchWeather("London")}
                        className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        Reset to Default
                    </button>
                </div>
            )}

            {(loading || weather) && (
                <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    <section className="lg:col-span-4 h-full">
                        {loading ? <WeatherCardSkeleton /> : weather && <WeatherCard data={weather} />}
                    </section>

                    <section className="lg:col-span-8 flex flex-col space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                                Extented Forecast
                            </h2>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-xs font-bold text-slate-400">72 HOURS</span>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">5 DAYS</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto pb-4 sm:pb-0 h-full">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <ForecastCardSkeleton key={i} />
                                ))
                            ) : (
                                weather?.forecast.map((day, i) => (
                                    <ForecastCard key={i} data={day} />
                                ))
                            )}
                        </div>

                        {/* Added a secondary data row for premium feel */}
                        {!loading && weather && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                                <div className="bg-slate-900 text-white p-6 rounded-[2rem] flex items-center justify-between overflow-hidden relative group">
                                    <div className="relative z-10">
                                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Visibility</p>
                                        <p className="text-3xl font-bold italic">10.0 <span className="text-lg not-italic opacity-50">km</span></p>
                                    </div>
                                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center relative z-10">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-blue-400">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        </svg>
                                    </div>
                                    <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-all"></div>
                                </div>

                                <div className="bg-white border border-slate-100 p-6 rounded-[2rem] flex items-center justify-between overflow-hidden relative group shadow-sm">
                                    <div className="relative z-10">
                                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">UV Index</p>
                                        <p className="text-3xl font-bold italic">4 <span className="text-lg not-italic text-slate-300">Moderate</span></p>
                                    </div>
                                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center relative z-10">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-orange-400">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M3 12h2.25m.386-6.364 1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M3 12h2.25m.386-6.364 1.591-1.591M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </main>
            )}
        </div>
    );
}
