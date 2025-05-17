// app/components/StatusBar.tsx
"use client";

import Image from 'next/image';
// Korrigierte Icon-Importe von lucide-react
import { RefreshCwIcon, Cog, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDate, formatLastUpdateTime } from '../utils'; // Pfad anpassen

// Importiere den User-Typ aus dem AuthContext, um user.isAdmin zu prüfen
// und die Motion-Komponente für Animationen
import { User } from '../contexts/AuthContext'; // Passe den Pfad ggf. an
import { motion } from 'framer-motion';


interface StatusBarProps {
  isDbConnected: boolean;
  lastDataUpdateTimestamp: Date | null;
  // NEUE Props für Authentifizierung und Aktionen
  isAuthenticated: boolean;
  user: User | null; // User-Objekt, um isAdmin zu prüfen
  logout: () => void; // Logout-Funktion
}

export default function StatusBar({
  isDbConnected,
  lastDataUpdateTimestamp,
  isAuthenticated,
  user,
  logout
}: StatusBarProps) {
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
    <div className="fixed top-0 h-14 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md text-slate-300 text-xs px-4 shadow-lg flex justify-between items-center"> {/* Shadow-lg für mehr Tiefe */}
      {/* Linke Seite der Statusleiste */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Cottbusverkehr Logo"
            width={120}
            height={22}
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
            <span className="hidden lg:inline mr-1">Letzte Aktualisierung: </span>
            <span>{formatLastUpdateTime(lastDataUpdateTimestamp)}</span>
          </div>
        )}
      </div>

      {/* Rechte Seite der Statusleiste - jetzt mit Auth-Knöpfen */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <span className="hidden sm:inline">{currentDate}</span>
        <span className="font-mono text-sm mr-2 sm:mr-3">{currentTime}</span>

        {/* Auth-Knöpfe werden nur angezeigt, wenn der Benutzer authentifiziert ist */}
        {isAuthenticated && (
          <>
            {/* Admin-Knopf: Wird nur angezeigt, wenn user.isAdmin true ist */}
            {user?.isAdmin && (
              <motion.button
                onClick={() => alert("Admin-Bereich Aktionen hier implementieren!")}
                title="Admin Bereich"
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold p-1.5 sm:p-2 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-150 ease-in-out flex items-center group"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Cog className="h-4 w-4 sm:h-5 sm:w-5 group-hover:rotate-45 transition-transform duration-200" />
                 {/* Optional: Text "Admin" für größere Bildschirme, wenn gewünscht */}
                {/* <span className="ml-1.5 hidden lg:inline text-xs font-medium">Admin</span> */}
              </motion.button>
            )}
            {/* Logout-Knopf - Gestylt */}
            <button
              onClick={logout}
              title="Abmelden"
              className="flex items-center bg-red-600 hover:bg-red-700 text-white font-semibold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transform hover:scale-105 active:scale-95 transition-all duration-150 ease-in-out group"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 ease-in-out group-hover:translate-x-0.5" />
              {/* Text "Abmelden" für mittlere und größere Bildschirme */}
              <span className="ml-1.5 hidden md:inline text-xs font-medium">Abmelden</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
