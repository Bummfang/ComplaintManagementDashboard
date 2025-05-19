// app/components/DataItemCard/CardActions.tsx
"use client";

import { motion } from 'framer-motion';
import { Settings2Icon, Lock, Unlock } from 'lucide-react';
import React from 'react';
import { ViewType, AnyItemStatus } from '@/app/types'; // Pfad anpassen

// Framer Motion Varianten für das Einblenden der Buttons
const contentItemVariants = {
    hidden: { opacity: 0, y: 10 }, // Sanftes Einblenden von unten
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

const buttonHoverSpring = { type: "spring", stiffness: 400, damping: 15 };

interface CardActionsProps {
    status?: AnyItemStatus; // Der effektive Status des Items
    isLocked: boolean;
    canFlip: boolean; // Ob die Karte umgedreht werden kann (für "Interne Details")
    onStatusChange: (newStatus: AnyItemStatus) => void; // Nimmt nur den neuen Status entgegen
    onToggleLock: () => void;
    onFlip: () => void;
    shakeLockAnim: boolean;
    isAssigning: boolean; // Um den Lock-Button während der Zuweisung zu deaktivieren
    // itemId und currentView werden nicht mehr direkt hier benötigt,
    // da onStatusChange sie bereits gekapselt von DataItemCard erhält.
}

const CardActions: React.FC<CardActionsProps> = ({
    status,
    isLocked,
    canFlip,
    onStatusChange,
    onToggleLock,
    onFlip,
    shakeLockAnim,
    isAssigning,
}) => {
    let actionButton = null;

    // Logik zur Bestimmung der Aktionsbuttons basierend auf dem Status
    // Diese Logik wurde aus der ursprünglichen DataItemCard übernommen.
    // Stellt sicher, dass 'status' hier der 'effectiveStatus' aus useStatusLogic ist.
    switch (status) {
        case "Offen":
            actionButton = (
                <motion.button
                    onClick={() => onStatusChange("In Bearbeitung")}
                    className="w-full text-amber-300 hover:text-amber-200 bg-amber-600/30 hover:bg-amber-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Bearbeitung starten"
                    whileHover={{ scale: isLocked ? 1 : 1.03, y: isLocked ? 0 : -2, transition: buttonHoverSpring }}
                    whileTap={{ scale: isLocked ? 1 : 0.97 }}
                    disabled={isLocked}
                >
                    Bearbeitung starten
                </motion.button>
            );
            break;
        case "In Bearbeitung":
            actionButton = (
                <div className="flex space-x-2">
                    <motion.button
                        onClick={() => onStatusChange("Gelöst")}
                        className="flex-1 text-green-300 hover:text-green-200 bg-green-600/30 hover:bg-green-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Als gelöst markieren"
                        whileHover={{ scale: isLocked ? 1 : 1.03, y: isLocked ? 0 : -2, transition: buttonHoverSpring }}
                        whileTap={{ scale: isLocked ? 1 : 0.97 }}
                        disabled={isLocked}
                    >
                        Gelöst
                    </motion.button>
                    <motion.button
                        onClick={() => onStatusChange("Abgelehnt")}
                        className="flex-1 text-red-300 hover:text-red-200 bg-red-600/30 hover:bg-red-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Ablehnen"
                        whileHover={{ scale: isLocked ? 1 : 1.03, y: isLocked ? 0 : -2, transition: buttonHoverSpring }}
                        whileTap={{ scale: isLocked ? 1 : 0.97 }}
                        disabled={isLocked}
                    >
                        Ablehnen
                    </motion.button>
                </div>
            );
            break;
        case "Gelöst":
        case "Abgelehnt":
            actionButton = (
                <motion.button
                    onClick={() => onStatusChange("Offen")}
                    className="w-full text-sky-300 hover:text-sky-200 bg-sky-600/30 hover:bg-sky-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Wieder öffnen"
                    whileHover={{ scale: isLocked ? 1 : 1.03, y: isLocked ? 0 : -2, transition: buttonHoverSpring }}
                    whileTap={{ scale: isLocked ? 1 : 0.97 }}
                    disabled={isLocked}
                >
                    Wieder öffnen
                </motion.button>
            );
            break;
        default:
            // Für den Fall, dass der Status undefined ist oder nicht behandelt wird (sollte nicht passieren, wenn isStatusRelevantView true ist)
            actionButton = null; 
            break;
    }

    // Wenn kein Status relevant ist oder kein ActionButton definiert wurde, zeige nichts an
    if (!status || !actionButton) {
        return null;
    }

    return (
        <motion.div variants={contentItemVariants} className="pt-2"> {/* pt-2 für etwas Abstand zum Inhalt oben */}
            <div className={`flex ${canFlip ? 'justify-between' : 'justify-end'} items-center mb-2`}>
                {canFlip && (
                    <motion.button
                        onClick={onFlip}
                        disabled={isLocked || isAssigning} // Deaktivieren, wenn gesperrt oder gerade zugewiesen wird
                        className="p-1.5 rounded-full text-slate-400 hover:text-sky-400 transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Interne Details bearbeiten"
                        whileHover={{ scale: (isLocked || isAssigning) ? 1 : 1.1, rotate: (isLocked || isAssigning) ? 0 :15 }}
                        whileTap={{ scale: (isLocked || isAssigning) ? 1 : 0.9 }}
                    >
                        <Settings2Icon size={20} />
                    </motion.button>
                )}
                <motion.button
                    onClick={onToggleLock}
                    disabled={isAssigning} // Deaktivieren, während der API-Call läuft
                    className={`p-1.5 rounded-full transition-colors duration-150 ease-in-out 
                                ${isLocked ? 'text-slate-400 hover:text-sky-400' : 'text-emerald-400 hover:text-emerald-300'} 
                                focus:outline-none focus-visible:ring-2 
                                ${isLocked ? 'focus-visible:ring-sky-500' : 'focus-visible:ring-emerald-500'} 
                                focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
                                disabled:opacity-50 disabled:cursor-wait`}
                    title={isLocked ? (isAssigning ? "Wird zugewiesen..." : "Bearbeitung entsperren") : "Bearbeitung sperren"}
                    animate={shakeLockAnim ? { x: [0, -8, 8, -6, 6, -4, 4, 0], scale: [1, 1.1, 1, 1.05, 1], transition: { duration: 0.4, ease: "easeInOut" } } : { x: 0, scale: 1 }}
                    whileHover={{ scale: isAssigning ? 1 : 1.1 }}
                    whileTap={{ scale: isAssigning ? 1 : 0.9 }}
                >
                    {isAssigning ? (
                        <motion.svg className="animate-spin h-5 w-5 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </motion.svg>
                    ) : (
                        isLocked ? <Lock size={20} /> : <Unlock size={20} />
                    )}
                </motion.button>
            </div>
            {actionButton}
        </motion.div>
    );
};

export default CardActions;
