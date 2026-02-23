import { WeatherData } from "@/types/weather";
import Image from "next/image";

interface WeatherCardProps {
    data: WeatherData;
}

export default function WeatherCard({ data }: WeatherCardProps) {
    return (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100/50 border border-slate-50 relative overflow-hidden group h-full flex flex-col">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl group-hover:bg-blue-100/50 transition-all duration-700"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-indigo-50/30 rounded-full blur-2xl group-hover:bg-indigo-100/30 transition-all duration-700"></div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500">
                                <path fillRule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                            </svg>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{data.city}</h3>
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs px-1">{data.condition}</p>
                    </div>
                    <div className="relative w-20 h-20 drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-500">
                        <Image
                            src={`https://openweathermap.org/img/wn/${data.icon}@4x.png`}
                            alt={data.condition}
                            fill
                            className="object-contain"
                        />
                    </div>
                </div>

                <div className="mb-12 flex-grow flex items-center">
                    <div className="relative">
                        <span className="text-[9rem] font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                            {data.temperature}
                        </span>
                        <span className="absolute top-4 -right-8 text-5xl font-black text-blue-500 leading-none">°</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-y-8 gap-x-6 pt-10 border-t border-slate-100/80">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            <span className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black">Humidity</span>
                        </div>
                        <span className="text-slate-900 font-black text-2xl">{data.humidity}<span className="text-sm font-bold text-slate-300 ml-1">%</span></span>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                            <span className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black">Wind Speed</span>
                        </div>
                        <span className="text-slate-900 font-black text-2xl">{data.wind}<span className="text-sm font-bold text-slate-300 ml-1">km/h</span></span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function WeatherCardSkeleton() {
    return (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-50 h-full animate-pulse">
            <div className="flex justify-between items-start mb-12">
                <div className="space-y-4">
                    <div className="h-10 w-48 bg-slate-100 rounded-2xl"></div>
                    <div className="h-4 w-24 bg-slate-50 rounded-lg"></div>
                </div>
                <div className="w-20 h-20 bg-slate-100 rounded-[2rem]"></div>
            </div>
            <div className="h-32 w-56 bg-slate-100 rounded-3xl mb-12"></div>
            <div className="grid grid-cols-2 gap-10 pt-10 border-t border-slate-50">
                <div className="space-y-3">
                    <div className="h-3 w-16 bg-slate-50 rounded"></div>
                    <div className="h-8 w-20 bg-slate-100 rounded-xl"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-3 w-16 bg-slate-50 rounded"></div>
                    <div className="h-8 w-20 bg-slate-100 rounded-xl"></div>
                </div>
            </div>
        </div>
    );
}
