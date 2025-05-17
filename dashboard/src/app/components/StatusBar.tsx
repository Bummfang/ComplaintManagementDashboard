// app/components/StatusBar.tsx
"use client";

import Image from 'next/image';
import { RefreshCwIcon, PowerIcon } from 'lucide-react'; 
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate, formatLastUpdateTime } from '../utils'; // Pfad anpassen

const MotionPowerIcon = motion(PowerIcon);

interface StatusBarProps {
  isDbConnected: boolean;
  lastDataUpdateTimestamp: Date | null;
  isAuthenticated: boolean;
  logout: () => void;
}

export default function StatusBar({
  isDbConnected,
  lastDataUpdateTimestamp,
  isAuthenticated,
  logout,
}: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState<string>("--:--:--");
  const [currentDate, setCurrentDate] = useState<string>("--.--.----");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }));
    };
    updateDateTime();
    const timerId = setInterval(updateDateTime, 1000);
    return () => clearInterval(timerId);
  }, []);

  const statusBarVariants = {
    hidden: { y: -80, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 120, damping: 20, duration: 0.5 },
    },
  };

  const sectionItemVariants = { 
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
  };
  
  const powerIconVariants = {
    initial: { 
      color: "rgba(74, 222, 128, 1)", 
      filter: "drop-shadow(0 0 7px rgba(74, 222, 128, 0.8))", 
      scale: 1 
    },
    hover: { 
      color: "rgba(239, 68, 68, 1)", 
      filter: "drop-shadow(0 0 9px rgba(239, 68, 68, 0.9))", 
      scale: 1.18 
    },
    tap: { 
      color: "rgba(220, 38, 38, 1)", 
      filter: "drop-shadow(0 0 8px rgba(220, 38, 38, 1))", 
      scale: 1.1 
    }
  };

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 h-16 text-sm px-4 sm:px-6 flex justify-between items-center
                 bg-gradient-to-r from-slate-900/80 via-[#10121A]/75 to-slate-900/80 
                 backdrop-blur-xl 
                 border-b border-slate-600/60 
                 shadow-[0_8px_30px_rgba(0,0,0,0.2),_0_0_20px_rgba(14,165,233,0.15)] 
                 text-slate-100"
      variants={statusBarVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Linke Sektion: flex-1 hinzugefügt */}
      <motion.div 
        className="flex flex-1 items-center space-x-3 sm:space-x-5" 
        variants={sectionItemVariants}
      >
        <motion.div className="flex-shrink-0" whileHover={{ scale: 1.03, rotate: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Image
            src="/logo.png" 
            alt="Firmenlogo"
            width={120} 
            height={28} 
            priority
            className="object-contain"
          />
        </motion.div>

        <motion.div 
          className="flex items-center cursor-default"
          title={isDbConnected ? "API Verbindung aktiv" : "API Verbindung unterbrochen"}
        >
          <motion.span
            className={`w-3 h-3 rounded-full inline-block mr-2 border-2 ${
              isDbConnected
                ? 'bg-green-500 border-green-400 shadow-[0_0_7px_1px_rgba(74,222,128,0.6)]' 
                : 'bg-red-500 border-red-400 shadow-[0_0_7px_1px_rgba(239,68,68,0.5)]' 
            }`}
            animate={{
              scale: isDbConnected ? [1, 1.15, 1] : 1, 
              opacity: isDbConnected ? [0.8, 1, 0.8] : 1,
            }}
            transition={isDbConnected ? { duration: 1.3, repeat: Infinity, ease: "easeInOut" } : {}}
          />
          <span className="hidden sm:inline font-medium text-slate-200"> 
            {isDbConnected ? "Online" : "Offline"}
          </span>
        </motion.div>

        <AnimatePresence>
          {lastDataUpdateTimestamp && (
            <motion.div
              className="hidden md:flex items-center text-slate-300" 
              title={`Daten zuletzt abgerufen um ${formatLastUpdateTime(lastDataUpdateTimestamp)}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <RefreshCwIcon size={14} className="mr-1.5 animate-spin flex-shrink-0 text-sky-400" />
              <span className="hidden lg:inline mr-1">Aktualisiert:</span>
              <span>{formatLastUpdateTime(lastDataUpdateTimestamp)}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Mittlere Sektion - Logout Button: Keine Änderung an den Flex-Eigenschaften hier, wird durch die äußeren Sektionen zentriert */}
      {isAuthenticated && (
        <motion.div 
          className="flex justify-center" 
          variants={sectionItemVariants}
        >
          <motion.button
            onClick={logout}
            title="Abmelden"
            className="p-2.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            <MotionPowerIcon
              size={30} 
              variants={powerIconVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              transition={{ duration: 0.2, ease: "easeInOut" }}
            />
          </motion.button>
        </motion.div>
      )}
      {/* Fallback, falls nicht authentifiziert. Dieser nimmt keinen zusätzlichen Platz ein, wenn der mittlere Button da ist. */}
      {/* Wenn der mittlere Button fehlt, ist es wichtig, dass dieser flex-1 hat, damit justify-between funktioniert. */}
      {/* Da der mittlere Button aber nur bei isAuthenticated da ist, ist die Logik komplexer. */}
      {/* Einfachere Lösung: Wenn nicht authentifiziert, wird die mittlere Sektion nicht gerendert. */}
      {/* Die äußeren Sektionen (links, rechts) werden dann den Raum füllen. */}
      {/* Um die Zentrierung zu verbessern, wenn der mittlere Teil fehlt, könnte man den mittleren Teil immer rendern, aber unsichtbar machen. */}
      {/* Oder die Struktur dynamisch anpassen. Fürs Erste lassen wir es so, da der Fokus auf dem authentifizierten Zustand liegt. */}
      {!isAuthenticated && <div className="w-0 h-0"></div>} {/* Minimaler Platzhalter, wenn nicht auth */}


      {/* Rechte Sektion - Datum und Uhrzeit: flex-1 und justify-end hinzugefügt */}
      <motion.div 
        className="flex flex-1 items-center justify-end" 
        variants={sectionItemVariants}
      >
        <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="font-medium text-slate-200">{currentDate}</span> 
            <span className="font-mono text-base text-sky-400">{currentTime}</span> 
        </div>
         <div className="sm:hidden font-mono text-base text-sky-400">{currentTime}</div>
      </motion.div>
    </motion.div>
  );
}
