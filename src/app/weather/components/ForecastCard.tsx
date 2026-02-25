import { ForecastDay } from "@/types/weather";
import Image from "next/image";

interface ForecastCardProps {
    data: ForecastDay;
}

export default function ForecastCard({ data }: ForecastCardProps) {
    const iconSrc = data.icon.startsWith('http')
        ? data.icon.replace('size=medium', 'size=large') // Get a slightly better res from NWS if possible
        : `https://openweathermap.org/img/wn/${data.icon}@2x.png`;

    return (
        <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-50 flex flex-col items-center text-center hover:shadow-lg transition-all transform hover:-translate-y-1">
            <span className="text-slate-500 font-bold mb-2 text-[10px] uppercase tracking-wider h-8 flex items-center justify-center leading-tight">
                {data.date}
            </span>
            <div className="relative w-12 h-12 mb-3 rounded-full overflow-hidden shadow-sm">
                <Image
                    src={iconSrc}
                    alt={data.condition}
                    fill
                    className="object-cover"
                    unoptimized
                />
            </div>
            <div className="flex flex-col mb-2 h-10 w-full justify-center">
                {data.max !== null && (
                    <span className="text-sm font-bold text-slate-800 tabular-nums">High: <span className="text-red-500">{data.max}°</span></span>
                )}
                {data.min !== null && (
                    <span className="text-sm font-bold text-slate-800 tabular-nums">Low: <span className="text-blue-500">{data.min}°</span></span>
                )}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold line-clamp-2 h-6 leading-tight">
                {data.condition}
            </span>
        </div>
    );
}

export function ForecastCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-50 flex flex-col items-center animate-pulse">
            <div className="h-4 w-12 bg-slate-100 rounded mb-4"></div>
            <div className="w-12 h-12 bg-slate-200 rounded-full mb-4"></div>
            <div className="space-y-2 flex flex-col items-center w-full">
                <div className="h-6 w-10 bg-slate-200 rounded"></div>
                <div className="h-4 w-8 bg-slate-100 rounded"></div>
            </div>
        </div>
    );
}
