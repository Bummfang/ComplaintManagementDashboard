// ./src/app/components/DataItemCard/CardActions.tsx
"use client";

import { motion } from 'framer-motion';
import { Settings2Icon, Lock, Unlock, RotateCcwIcon } from 'lucide-react';
import React, { useState } from 'react';
import { AnyItemStatus as StrictStatus, ViewType } from '@/app/types';

const contentItemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

const buttonHoverSpring = { type: "spring", stiffness: 400, damping: 15 };

interface CardActionsProps {
    status?: StrictStatus;
    isLockedByHook: boolean;
    isAssigning: boolean;
    isProcessingFile: boolean;
    isFinalized: boolean;
    canFlip: boolean; 
    onStatusChange: (newStatus: StrictStatus) => void;
    onToggleLock: () => void;
    onFlip: () => void;
    shakeLockAnim: boolean;
    isClarificationMissingInSavedDetails: boolean;
    currentView: ViewType;
}

const CardActions: React.FC<CardActionsProps> = ({
    status,
    isLockedByHook,
    isAssigning,
    isProcessingFile,
    isFinalized,
    canFlip, 
    onStatusChange,
    onToggleLock,
    onFlip,
    shakeLockAnim,
    isClarificationMissingInSavedDetails,
    currentView,
}) => {
    const [animateSettingsIcon, setAnimateSettingsIcon] = useState(false);
    const [isSettingsIconHovered, setIsSettingsIconHovered] = useState(false);
    const [animateLockIconWhenActionDisabled, setAnimateLockIconWhenActionDisabled] = useState(false);
    const [isLockIconHovered, setIsLockIconHovered] = useState(false);

    const generalActionsDisabled = isLockedByHook || isAssigning || isProcessingFile;
    const disableResolveActions = generalActionsDisabled || (isClarificationMissingInSavedDetails && status === "In Bearbeitung" && currentView === 'beschwerden');

    const handleMainActionButtonHover = (isHovering: boolean) => {
        if (isClarificationMissingInSavedDetails && status === "In Bearbeitung" && currentView === 'beschwerden' && disableResolveActions) {
            setAnimateSettingsIcon(isHovering);
        }
        if (generalActionsDisabled && status && !isFinalized ) {
           setAnimateLockIconWhenActionDisabled(isHovering);
        } else if (generalActionsDisabled && isFinalized && status !== "Offen"){ 
            setAnimateLockIconWhenActionDisabled(isHovering);
        }
    };

    let actionButton = null;

    if (isFinalized) { 
        if (currentView === 'lob' && status === 'Gelöst') {
            actionButton = (
                <div className="text-center text-xs text-green-400 py-1.5">
                    Lob wurde als erledigt markiert.
                </div>
            );
        } else if (currentView === 'anregungen' && (status === 'Gelöst' || status === 'Abgelehnt')) {
            const messageText = status === 'Gelöst' ? "Anregung wurde angenommen." : "Anregung wurde verworfen.";
            const textColor = status === 'Gelöst' ? 'text-green-400' : 'text-red-400';
            actionButton = (
                <div className={`text-center text-xs py-1.5 ${textColor}`}>
                    {messageText}
                    <span className="block text-slate-400 text-xxs">(Kann wieder geöffnet werden)</span>
                </div>
            );
        }
        
        if (currentView !== 'lob') { // "Wieder öffnen" für alle außer Lob
            actionButton = ( 
                <motion.button
                    onClick={() => onStatusChange("Offen")}
                    className="w-full text-sky-300 hover:text-sky-200 bg-sky-600/30 hover:bg-sky-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    title={generalActionsDisabled ? "Aktion blockiert (siehe Schloss-Icon)" : "Wieder öffnen"}
                    whileHover={{ scale: generalActionsDisabled ? 1 : 1.03, y: generalActionsDisabled ? 0 : -2, transition: buttonHoverSpring }}
                    whileTap={{ scale: generalActionsDisabled ? 1 : 0.97 }}
                    disabled={generalActionsDisabled} 
                    onHoverStart={() => handleMainActionButtonHover(true)}
                    onHoverEnd={() => handleMainActionButtonHover(false)}
                >
                    <RotateCcwIcon size={14} /> Wieder öffnen
                </motion.button>
            );
        }
    } else { 
        switch (status) {
            case "Offen":
                actionButton = (
                    <motion.button
                        onClick={() => onStatusChange("In Bearbeitung")}
                        className="w-full text-amber-300 hover:text-amber-200 bg-amber-600/30 hover:bg-amber-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                        title={generalActionsDisabled ? "Karte ist gesperrt (Schloss-Icon)" : "Bearbeitung starten"}
                        whileHover={{ scale: generalActionsDisabled ? 1 : 1.03, y: generalActionsDisabled ? 0 : -2, transition: buttonHoverSpring }}
                        whileTap={{ scale: generalActionsDisabled ? 1 : 0.97 }}
                        disabled={generalActionsDisabled}
                        onHoverStart={() => handleMainActionButtonHover(true)}
                        onHoverEnd={() => handleMainActionButtonHover(false)}
                    >
                        Bearbeitung starten
                    </motion.button>
                );
                break;
            case "In Bearbeitung":
                actionButton = (
                    <div className={`flex ${currentView === 'lob' ? 'justify-center' : 'space-x-2'}`}>
                        <motion.button
                            onClick={() => onStatusChange("Gelöst")}
                            className={`text-green-300 hover:text-green-200 bg-green-600/30 hover:bg-green-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${currentView === 'lob' ? 'w-full' : 'flex-1'}`}
                            title={disableResolveActions ? (generalActionsDisabled && !isClarificationMissingInSavedDetails ? "Karte gesperrt (Schloss-Icon)" : "Interne Details ausfüllen (Zahnrad-Icon)") : (currentView === 'lob' ? "Als erledigt markieren" : (currentView === 'anregungen' ? "Anregung annehmen" : "Als gelöst markieren"))}
                            whileHover={{ scale: disableResolveActions ? 1 : 1.03, y: disableResolveActions ? 0 : -2, transition: buttonHoverSpring }}
                            whileTap={{ scale: disableResolveActions ? 1 : 0.97 }}
                            disabled={disableResolveActions}
                            onHoverStart={() => handleMainActionButtonHover(true)}
                            onHoverEnd={() => handleMainActionButtonHover(false)}
                        >
                            {currentView === 'lob' ? "Erledigt" : (currentView === 'anregungen' ? "Annehmen" : "Gelöst")}
                        </motion.button>
                        {currentView !== 'lob' && (
                            <motion.button
                                onClick={() => onStatusChange("Abgelehnt")}
                                className="flex-1 text-red-300 hover:text-red-200 bg-red-600/30 hover:bg-red-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                                title={disableResolveActions ? (generalActionsDisabled && !isClarificationMissingInSavedDetails ? "Karte gesperrt (Schloss-Icon)" : "Interne Details ausfüllen (Zahnrad-Icon)") : (currentView === 'anregungen' ? "Anregung verwerfen" : "Ablehnen")}
                                whileHover={{ scale: disableResolveActions ? 1 : 1.03, y: disableResolveActions ? 0 : -2, transition: buttonHoverSpring }}
                                whileTap={{ scale: disableResolveActions ? 1 : 0.97 }}
                                disabled={disableResolveActions}
                                onHoverStart={() => handleMainActionButtonHover(true)}
                                onHoverEnd={() => handleMainActionButtonHover(false)}
                            >
                                {currentView === 'anregungen' ? "Verwerfen" : "Ablehnen"}
                            </motion.button>
                        )}
                    </div>
                );
                break;
        }
    }

    if (!status) return null;

    return (
        <motion.div variants={contentItemVariants} className="pt-2">
            <div className={`flex ${canFlip ? 'justify-between' : 'justify-end'} items-center mb-2`}>
                {canFlip && (
                    <motion.button
                        onClick={onFlip}
                        disabled={isLockedByHook || isAssigning || isProcessingFile}
                        className="p-1.5 rounded-full text-slate-400 hover:text-sky-400 transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Interne Details bearbeiten"
                        onHoverStart={() => setIsSettingsIconHovered(true)}
                        onHoverEnd={() => setIsSettingsIconHovered(false)}
                        animate={
                            animateSettingsIcon && !(isLockedByHook || isAssigning || isProcessingFile) ?
                            { scale: [1, 1.5, 1.2, 1.5, 1], rotate: [0, 15, -12, 10, -8, 0], transition: { duration: 0.7, ease: "easeInOut", repeat: 0 } } :
                            (isLockedByHook || isAssigning || isProcessingFile) ? { scale: 1, rotate: 0 } :
                            isSettingsIconHovered ? { scale: 1.15, rotate: 15, transition: { type: "spring", stiffness: 350, damping: 10 } } :
                            { scale: 1, rotate: 0 }
                        }
                        whileTap={{ scale: (isLockedByHook || isAssigning || isProcessingFile) ? 1 : 0.9 }}
                    >
                        <Settings2Icon size={20} />
                    </motion.button>
                )}
                <motion.button
                    onClick={onToggleLock}
                    disabled={isAssigning || isProcessingFile} 
                    className={`p-1.5 rounded-full transition-colors duration-150 ease-in-out
                                ${isLockedByHook && !isAssigning ? 'text-slate-400 hover:text-sky-400' : (!isLockedByHook && !isAssigning ? 'text-emerald-400 hover:text-emerald-300' : '')}
                                ${isAssigning ? 'text-sky-500' : ''}
                                focus:outline-none focus-visible:ring-2
                                ${isLockedByHook && !isAssigning ? 'focus-visible:ring-sky-500' : 'focus-visible:ring-emerald-500'}
                                focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
                                disabled:opacity-50 disabled:cursor-wait`}
                    title={isAssigning ? "Wird zugewiesen..." : (isLockedByHook ? "Bearbeitung entsperren (mir zuweisen)" : "Bearbeitung sperren (für mich freigeben)")}
                    onHoverStart={() => setIsLockIconHovered(true)}
                    onHoverEnd={() => setIsLockIconHovered(false)}
                     animate={
                        shakeLockAnim ?
                        { x: [0, -8, 8, -6, 6, -4, 4, 0], scale: [1, 1.1, 1, 1.05, 1], transition: { duration: 0.4, ease: "easeInOut" } } :
                        animateLockIconWhenActionDisabled ?
                        {
                            scale: [1, 1.4, 1.1, 1.4, 1],
                            filter: ["drop-shadow(0 0 0px rgba(56,189,248,0))", "drop-shadow(0 0 8px rgba(56,189,248,0.7))", "drop-shadow(0 0 2px rgba(56,189,248,0.4))", "drop-shadow(0 0 8px rgba(56,189,248,0.7))", "drop-shadow(0 0 0px rgba(56,189,248,0))"],
                            transition: { duration: 0.8, ease: "easeInOut", repeat: 0 }
                        } :
                        isAssigning ? { scale: 1 } :
                        isLockIconHovered ? { scale: 1.15, transition: { type: "spring", stiffness: 350, damping: 10 } } :
                        { scale: 1, filter: "drop-shadow(0 0 0px rgba(56,189,248,0))" }
                    }
                    whileTap={{ scale: isAssigning ? 1 : 0.9 }}
                >
                    {isAssigning ? (
                        <motion.svg className="animate-spin h-5 w-5 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></motion.svg>
                    ) : (
                        isLockedByHook ? <Lock size={20} /> : <Unlock size={20} />
                    )}
                </motion.button>
            </div>
            {actionButton ? actionButton : <div className="h-[33px]"></div>}
        </motion.div>
    );
};

export default CardActions;