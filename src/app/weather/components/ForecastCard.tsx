import { ForecastDay } from "@/types/weather";
import Image from "next/image";

interface ForecastCardProps {
    data: ForecastDay;
}

export default function ForecastCard({ data }: ForecastCardProps) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-50 flex flex-col items-center text-center hover:shadow-lg transition-all transform hover:-translate-y-1">
            <span className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">{data.date}</span>
            <div className="relative w-12 h-12 mb-2">
                <Image
                    src={`https://openweathermap.org/img/wn/${data.icon}@2x.png`}
                    alt={data.condition}
                    fill
                    className="object-contain"
                />
            </div>
            <div className="flex flex-col">
                <span className="text-xl font-bold text-slate-800 tabular-nums">{data.max}°</span>
                <span className="text-slate-400 text-sm font-semibold tabular-nums">{data.min}°</span>
            </div>
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
