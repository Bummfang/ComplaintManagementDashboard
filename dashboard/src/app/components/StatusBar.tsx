// app/components/StatusBar.tsx
"use client";

import Image from 'next/image';
import { RefreshCwIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDate, formatLastUpdateTime } from '../utils'; // Pfad anpassen

interface StatusBarProps {
    isDbConnected: boolean;
    lastDataUpdateTimestamp: Date | null;
}

export default function StatusBar({ isDbConnected, lastDataUpdateTimestamp }: StatusBarProps) {
    const [currentTime, setCurrentTime] = useState<string>("--:--:--");
    const [currentDate, setCurrentDate] = useState<string>("--.--.----");

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setCurrentDate(formatDate(now.toISOString(), { day: '2-digit', month: 'long', year: 'numeric' }));
        };
        updateDateTime();
        const timerId = setInterval(updateDateTime, 1000);
        return () => clearInterval(timerId);
    }, []);

    return (
        <div className="fixed top-0 h-15 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md text-slate-300 text-xs px-4 shadow-md flex justify-between items-center">
            {/* Linke Seite der Statusleiste */}
            <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                    <Image
                        src="/logo.png" // Stellen Sie sicher, dass logo.png im /public Ordner ist
                        alt="Cottbusverkehr Logo"
                        width={125}
                        height={24}
                        priority
                        className="object-contain"
                    />
                </div>
                <div className="flex items-center" title={isDbConnected ? "API Verbindung aktiv" : "API Verbindung unterbrochen"}>
                    <span className={`w-2.5 h-2.5 rounded-full inline-block mr-1.5 ${isDbConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className="hidden sm:inline">{isDbConnected ? "Online" : "Offline"}</span>
                </div>
                {lastDataUpdateTimestamp && (
                    <div className="hidden md:flex items-center text-slate-400" title={`Daten zuletzt abgerufen um ${formatLastUpdateTime(lastDataUpdateTimestamp)}`}>
                        <RefreshCwIcon size={12} className="mr-1.5 animate-spin flex-shrink-0" />
                        <span className="hidden lg:inline">Letzte Aktual.: </span>
                        <span>{formatLastUpdateTime(lastDataUpdateTimestamp)}</span>
                    </div>
                )}
            </div>

            {/* Rechte Seite der Statusleiste */}
            <div className="flex items-center space-x-3">
                <span className="hidden sm:inline">{currentDate}</span>
                <span className="font-mono text-sm">{currentTime}</span>
            </div>
        </div>
    );
}