"use client";

import Image from 'next/image';
import { RefreshCwIcon, PowerIcon, UserCircle2 } from 'lucide-react'; // UserCircle2 für Benutzer-Icon
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatLastUpdateTime } from '../utils';
import { useAuth } from '../contexts/AuthContext';




interface StatusBarProps {
    isDbConnected: boolean;
    lastDataUpdateTimestamp: Date | null;
}





export default function StatusBar({
    isDbConnected,
    lastDataUpdateTimestamp,
}: StatusBarProps) {
    const { isAuthenticated, user, logout } = useAuth();
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




    const statusBarVariants = { hidden: { y: -80, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 20, duration: 0.5 }, } };
    const sectionItemVariants = { hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }, };
    const powerIconWrapperVariants = {
        initial: { color: "rgba(74, 222, 128, 1)", filter: "drop-shadow(0 0 7px rgba(74, 222, 128, 0.8))", scale: 1 },
        hover: { color: "rgba(239, 68, 68, 1)", filter: "drop-shadow(0 0 9px rgba(239, 68, 68, 0.9))", scale: 1.18 },
        tap: { color: "rgba(220, 38, 38, 1)", filter: "drop-shadow(0 0 8px rgba(220, 38, 38, 1))", scale: 1.1 },
        transition: { duration: 0.2, ease: "easeInOut" }
    };




    
    return (
        <motion.div
            className="fixed top-0 left-0 right-0 z-50 h-16 text-sm px-4 sm:px-6 flex justify-between items-center
                       bg-gradient-to-r from-slate-900/80 via-[#10121A]/75 to-slate-900/80
                       backdrop-blur-xl border-b border-slate-600/60
                       shadow-[0_8px_30px_rgba(0,0,0,0.2),_0_0_20px_rgba(14,165,233,0.15)]
                       text-slate-100"
            variants={statusBarVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Linke Sektion */}
            <motion.div
                className="flex flex-1 items-center space-x-3 sm:space-x-5"
                variants={sectionItemVariants}
            >
                <motion.div className="flex-shrink-0" whileHover={{ scale: 1.03, rotate: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
                    <Image src="/logo.png" alt="Firmenlogo" width={120} height={28} priority className="object-contain"/>
                </motion.div>
                <motion.div className="flex items-center cursor-default" title={isDbConnected ? "API Verbindung aktiv" : "API Verbindung unterbrochen"}>
                    <motion.span
                        className={`w-3 h-3 rounded-full inline-block mr-2 border-2 ${ isDbConnected ? 'bg-green-500 border-green-400 shadow-[0_0_7px_1px_rgba(74,222,128,0.6)]' : 'bg-red-500 border-red-400 shadow-[0_0_7px_1px_rgba(239,68,68,0.5)]'}`}
                        animate={{ scale: isDbConnected ? [1, 1.15, 1] : 1, opacity: isDbConnected ? [0.8, 1, 0.8] : 1, }}
                        transition={isDbConnected ? { duration: 1.3, repeat: Infinity, ease: "easeInOut" } : {}}
                    />
                    <span className="hidden sm:inline font-medium text-slate-200">{isDbConnected ? "Online" : "Offline"}</span>
                </motion.div>
                <AnimatePresence>
                    {lastDataUpdateTimestamp && (
                        <motion.div
                            className="hidden md:flex items-center text-slate-300"
                            title={`Daten zuletzt abgerufen um ${formatLastUpdateTime(lastDataUpdateTimestamp)}`}
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            <RefreshCwIcon size={14} className="mr-1.5 animate-spin flex-shrink-0 text-sky-400" />
                            <span className="hidden lg:inline mr-1">Aktual.:</span>
                            <span>{formatLastUpdateTime(lastDataUpdateTimestamp)}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Mittlere Sektion - Begrüßung und Logout Button */}
            {isAuthenticated && user ? (
                <motion.div className="flex-shrink-0 flex items-center gap-3 sm:gap-4" variants={sectionItemVariants}>
                     <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300" title={`Angemeldet als ${user.username}`}>
                        <UserCircle2 size={18} className="text-sky-400 flex-shrink-0" />
                        <span className="font-medium text-slate-100">Willkommen, {user.name} {user.nachname}</span>
                     </div>
                    <motion.button
                        onClick={logout} title="Abmelden"
                        className="p-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900" // Größe des klickbaren Bereichs angepasst
                        initial="initial" whileHover="hover" whileTap="tap"
                    >
                        <motion.span variants={powerIconWrapperVariants} transition={powerIconWrapperVariants.transition}>
                            <PowerIcon size={20} /> {/* Icon-Größe leicht reduziert */}
                        </motion.span>
                    </motion.button>
                </motion.div>
            ) : (
                <div className="flex-shrink-0 w-10 h-10"></div> // Platzhalter
            )}

            {/* Rechte Sektion - Datum und Uhrzeit */}
            <motion.div className="flex flex-1 items-center justify-end" variants={sectionItemVariants}>
                <div className="hidden sm:flex flex-col items-end leading-tight">
                    <span className="font-medium text-slate-200">{currentDate}</span>
                    <span className="font-mono text-base text-sky-400">{currentTime}</span>
                </div>
                <div className="sm:hidden font-mono text-base text-sky-400">{currentTime}</div>
            </motion.div>
        </motion.div>
    );
}