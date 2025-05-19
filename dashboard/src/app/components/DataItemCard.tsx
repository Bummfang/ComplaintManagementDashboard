"use client";

import { motion, AnimatePresence } from 'framer-motion';
import {
    CopyIcon, CheckIcon, ClockIcon, Lock, Unlock, UserIcon, Settings2Icon,
    ArrowLeftIcon, SaveIcon, XCircleIcon, AlertCircleIcon, MessageSquareTextIcon,
    MailIcon, PhoneIcon, StickyNoteIcon, ListChecksIcon, CreditCardIcon // Hinzugefügte Icons für die Rückseite
} from 'lucide-react';
import { useState, useEffect, ReactNode } from 'react'; // ReactNode hinzugefügt
import { DataItem, BeschwerdeItem, ViewType, AnyItemStatus } from '../types';
import { formatDate, formatTime, formatDateTime } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../constants';

export interface InternalCardData {
    generalNotes: string;
    clarificationType: 'written' | 'phone' | null;
    teamLeadInformed: boolean;
    departmentHeadInformed: boolean;
    forwardedToSubcontractor: boolean;
    forwardedToInsurance: boolean;
    moneyRefunded: boolean;
    refundAmount: string;
}

const defaultInternalDetails: InternalCardData = {
    generalNotes: "",
    clarificationType: null,
    teamLeadInformed: false,
    departmentHeadInformed: false,
    forwardedToSubcontractor: false,
    forwardedToInsurance: false,
    moneyRefunded: false,
    refundAmount: "",
};

const getStatusTextColorClass = (status?: AnyItemStatus | null): string => {
    switch (status) {
        case "Offen": return "text-sky-400 font-medium";
        case "In Bearbeitung": return "text-amber-400 font-medium";
        case "Gelöst": return "text-green-400 font-medium";
        case "Abgelehnt": return "text-red-400 font-medium";
        default: return "text-slate-200";
    }
};

const getCardBackgroundAccentClasses = (status?: AnyItemStatus | null): string => {
    const baseFallback = "bg-slate-800/60";
    switch (status) {
        case "Offen": return "bg-sky-900/[.4]";
        case "In Bearbeitung": return "bg-amber-900/[.3]";
        case "Gelöst": return "bg-green-900/[.4]";
        case "Abgelehnt": return "bg-red-900/[.3]";
        default: return baseFallback;
    }
};

const DataField = ({
    label, value, onCopy, isCopied, copyValue, fieldKey, valueClassName, icon: Icon
}: {
    label: string; value?: string | null; onCopy?: (text: string, key: string) => void;
    isCopied?: boolean; copyValue?: string; fieldKey: string; valueClassName?: string; icon?: React.ElementType;
}) => {
    const displayValue = value || "N/A";
    const actualCopyValue = copyValue || displayValue;
    return (
        <div className="py-1 group">
            <span className="text-xs text-slate-400 block mb-0.5">{label}</span>
            <div className="flex items-center">
                {Icon && <Icon size={13} className="mr-1.5 text-slate-400 flex-shrink-0" />}
                <span className={`text-sm break-words ${valueClassName || 'text-slate-200'}`}>{displayValue}</span>
                {onCopy && displayValue !== "N/A" && (
                    <motion.button onClick={() => onCopy(actualCopyValue, fieldKey)}
                        className="ml-2 p-0.5 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        title={isCopied ? "Kopiert!" : "Kopieren"} whileTap={{ scale: 0.9 }} transition={{ duration: 0.1 }}
                    >
                        {isCopied ? <CheckIcon size={14} className="text-emerald-400" /> : <CopyIcon size={14} />}
                    </motion.button>
                )}
            </div>
        </div>
    );
};

// Kleine Hilfskomponente für Formularsektionen auf der Rückseite
const FormSection = ({
    title,
    icon: Icon,
    children,
    htmlFor,
    required,
    className
}: {
    title?: string;
    icon?: React.ElementType;
    children: ReactNode;
    htmlFor?: string;
    required?: boolean;
    className?: string;
}) => (
    <motion.div variants={contentItemVariants} className={`mb-5 last-of-type:mb-0 ${className || ''}`}>
        {title && (
            <div className="flex items-center mb-2">
                {Icon && <Icon size={18} className="mr-2 text-slate-400 flex-shrink-0" />}
                <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-200">
                    {title}
                    {required && <span className="text-red-400 ml-1">*</span>}
                </label>
            </div>
        )}
        <div className={`${title ? 'pl-1' : ''}`}> {/* Nur einrücken, wenn ein Titel da ist */}
            {children}
        </div>
    </motion.div>
);


const cardContainerVariants = {
    hidden: { opacity: 0, y: 60, scale: 0.9, rotateX: -20, transformPerspective: 1000 },
    visible: { opacity: 1, y: 0, scale: 1, rotateX: 0, transition: { type: "spring", stiffness: 120, damping: 20, staggerChildren: 0.08, delayChildren: 0.1 } },
    exit: { opacity: 0, scale: 0.85, transition: { duration: 0.2, ease: "easeOut" } }
};

const contentItemVariants = {
    hidden: { opacity: 0, x: -25, scale: 0.85 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 180, damping: 20 } }
};

const flipContentVariants = {
    initial: { opacity: 0, rotateY: -90 },
    animate: { opacity: 1, rotateY: 0, transition: { duration: 0.4, ease: "easeInOut" } },
    exit: { opacity: 0, rotateY: 90, transition: { duration: 0.3, ease: "easeInOut" } },
};

interface DataItemCardProps {
    item: DataItem & {
        action_required?: "relock_ui",
        internal_details?: InternalCardData;
    };
    currentView: ViewType;
    copiedCellKey: string | null;
    onCopyToClipboard: (textToCopy: string, cellKey: string) => void;
    onStatusChange: (itemId: number, newStatus: AnyItemStatus, itemType: ViewType) => void;
    cardAccentsEnabled: boolean;
    onItemUpdate: (updatedItem: DataItem & {
        action_required?: "relock_ui",
        internal_details?: InternalCardData;
    }) => void;
}

export default function DataItemCard({
    item, currentView, copiedCellKey, onCopyToClipboard, onStatusChange, cardAccentsEnabled, onItemUpdate
}: DataItemCardProps) {
    const itemTypePrefix = currentView === "beschwerden" ? "CMP-" : currentView === "lob" ? "LOB-" : "ANG-";
    const { user, token } = useAuth();

    const [isLocked, setIsLocked] = useState(true);
    const [shakeLockAnim, setShakeLockAnim] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [internalDetails, setInternalDetails] = useState<InternalCardData>(
        item.internal_details ? { ...defaultInternalDetails, ...item.internal_details } : { ...defaultInternalDetails }
    );
    const [validationError, setValidationError] = useState<string | null>(null);

    let currentItemStatus: AnyItemStatus | undefined | null;
    let itemAbgeschlossenAm: string | null | undefined;
    let itemBearbeiterId: number | null | undefined = undefined;
    let itemBearbeiterName: string | null | undefined = undefined;

    const isStatusRelevantView = currentView === 'beschwerden' || currentView === 'lob' || currentView === 'anregungen';

    if (item && 'bearbeiter_id' in item) itemBearbeiterId = item.bearbeiter_id;
    if (item && 'bearbeiter_name' in item) itemBearbeiterName = item.bearbeiter_name;
    if (item && 'status' in item) currentItemStatus = item.status as AnyItemStatus | undefined | null;
    if (item && 'abgeschlossenam' in item) itemAbgeschlossenAm = item.abgeschlossenam;

    useEffect(() => {
        if (isStatusRelevantView && item.status === "Offen" && item.bearbeiter_id === null && !isLocked && item.action_required === "relock_ui") {
            setIsLocked(true);
        }
    }, [item.status, item.bearbeiter_id, item.action_required, isLocked, isStatusRelevantView, item.id]);

    useEffect(() => {
        const newDetails = item.internal_details
            ? { ...defaultInternalDetails, ...item.internal_details }
            : { ...defaultInternalDetails };
        setInternalDetails(newDetails);

        if (isFlipped) {
            setValidationError(null); // Reset validation error when flipping to back
        }
    }, [item.internal_details, item.id, isFlipped]);

    const handleToggleLock = async () => {
        const wasLocked = isLocked;
        const newLockState = !wasLocked;
        setIsLocked(newLockState);

        if (shakeLockAnim) {
            setShakeLockAnim(false);
        }

        if (wasLocked && !newLockState && itemBearbeiterId === null && user?.userId && token && isStatusRelevantView) {
            try {
                console.log(`DataItemCard ID ${item.id}: Versuche Bearbeiter ${user.username} (ID: ${user.userId}) zuzuweisen.`);
                const apiEndpoint = API_ENDPOINTS[currentView as keyof typeof API_ENDPOINTS];
                if (!apiEndpoint) {
                    console.error("Kein API Endpunkt für Zuweisung für View:", currentView);
                    throw new Error("API Endpunkt nicht konfiguriert.");
                }

                const response = await fetch(apiEndpoint, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        id: item.id,
                        assign_me_as_bearbeiter: true
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: "Fehlerhafte Serverantwort" }));
                    console.error(`DataItemCard ID ${item.id}: Fehler beim Zuweisen des Bearbeiters - Status ${response.status}`, errorData);
                    setIsLocked(true);
                    triggerShakeLock();
                    return;
                }
                
                const updatedItemFromServer = await response.json();
                console.log(`DataItemCard ID ${item.id}: Bearbeiter erfolgreich zugewiesen. Antwort:`, updatedItemFromServer);
                onItemUpdate(updatedItemFromServer);

            } catch (err) {
                console.error(`DataItemCard ID ${item.id}: Schwerer Fehler beim Zuweisen des Bearbeiters:`, err);
                setIsLocked(true);
                triggerShakeLock();
            }
        }
    };

    const triggerShakeLock = () => {
        setShakeLockAnim(true);
        setTimeout(() => setShakeLockAnim(false), 400);
    };

    const handleProtectedStatusChange = (itemId: number, newStatus: AnyItemStatus, viewForApi: ViewType) => {
        if (isLocked && !isFlipped) {
            triggerShakeLock();
        } else {
            onStatusChange(itemId, newStatus, viewForApi);
        }
    };

    const handleInternalDetailChange = <K extends keyof InternalCardData>(
        key: K,
        value: InternalCardData[K]
    ) => {
        setInternalDetails(prev => {
            const newState = { ...prev, [key]: value };
            if (key === 'moneyRefunded' && !value) {
                newState.refundAmount = ""; // Reset refund amount if moneyRefunded is unchecked
            }
            return newState;
        });
        setValidationError(null); // Clear validation on any change
    };
    
    const handleSaveInternalData = () => {
        if (!internalDetails.clarificationType) {
            setValidationError("Bitte wählen Sie eine Klärungsart (schriftlich oder telefonisch).");
            return;
        }
        if (internalDetails.moneyRefunded && (!internalDetails.refundAmount || parseFloat(internalDetails.refundAmount) <= 0)) {
            setValidationError("Wenn 'Geld erstattet' gewählt ist, muss ein gültiger Betrag (größer als 0) eingetragen werden.");
            return;
        }
        setValidationError(null);

        onItemUpdate({ ...item, internal_details: { ...internalDetails } });
        setIsFlipped(false); // Flip back to front
    };

    const handleCancelInternalData = () => {
        // Reset to original item details or default if none
        setInternalDetails(item.internal_details ? { ...defaultInternalDetails, ...item.internal_details } : { ...defaultInternalDetails });
        setIsFlipped(false); // Flip back to front
        setValidationError(null);
    };

    let actionButton = null;
    if (isStatusRelevantView) {
        let effectiveStatusForButtons: AnyItemStatus = "Offen";
        if (currentItemStatus && ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"].includes(currentItemStatus)) {
            effectiveStatusForButtons = currentItemStatus;
        } else if (currentItemStatus === null || currentItemStatus === undefined) {
            effectiveStatusForButtons = "Offen";
            if (currentItemStatus === null) currentItemStatus = undefined; 
        } else {
            effectiveStatusForButtons = "Offen"; 
        }

        switch (effectiveStatusForButtons) {
            case "Offen":
                actionButton = ( <motion.button onClick={() => handleProtectedStatusChange(item.id, "In Bearbeitung", currentView)} className="w-full mt-3 text-amber-300 hover:text-amber-200 bg-amber-600/30 hover:bg-amber-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg" title="Bearbeitung starten" whileHover={{ scale: 1.03, y: -2, transition: { type: "spring", stiffness: 400, damping: 15 } }} whileTap={{ scale: 0.97 }} > Bearbeitung starten </motion.button> );
                break;
            case "In Bearbeitung":
                actionButton = ( <div className="flex space-x-2 mt-3"> <motion.button onClick={() => handleProtectedStatusChange(item.id, "Gelöst", currentView)} className="flex-1 text-green-300 hover:text-green-200 bg-green-600/30 hover:bg-green-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg" title="Als gelöst markieren" whileHover={{ scale: 1.03, y: -2, transition: { type: "spring", stiffness: 400, damping: 15 } }} whileTap={{ scale: 0.97 }} > Gelöst </motion.button> <motion.button onClick={() => handleProtectedStatusChange(item.id, "Abgelehnt", currentView)} className="flex-1 text-red-300 hover:text-red-200 bg-red-600/30 hover:bg-red-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg" title="Ablehnen" whileHover={{ scale: 1.03, y: -2, transition: { type: "spring", stiffness: 400, damping: 15 } }} whileTap={{ scale: 0.97 }} > Ablehnen </motion.button> </div> );
                break;
            case "Gelöst":
            case "Abgelehnt":
                actionButton = ( <motion.button onClick={() => handleProtectedStatusChange(item.id, "Offen", currentView)} className="w-full mt-3 text-sky-300 hover:text-sky-200 bg-sky-600/30 hover:bg-sky-600/50 px-3 py-1.5 rounded-lg transition-all duration-150 ease-in-out text-xs font-semibold shadow-md hover:shadow-lg" title="Wieder öffnen" whileHover={{ scale: 1.03, y: -2, transition: { type: "spring", stiffness: 400, damping: 15 } }} whileTap={{ scale: 0.97 }} > Wieder öffnen </motion.button> );
                break;
        }
    }

    const cardKey = `card-${currentView}-${item.id}`;
    const statusForAccent = currentItemStatus || (isStatusRelevantView ? "Offen" : undefined);
    const backgroundClass = isStatusRelevantView && statusForAccent && cardAccentsEnabled
        ? getCardBackgroundAccentClasses(statusForAccent)
        : 'bg-slate-800/60';
    
    let abgeschlossenText: string | null = null;
    let abgeschlossenValueClassName = "text-slate-500 italic";
    if (isStatusRelevantView) {
        if (itemAbgeschlossenAm) {
            abgeschlossenText = formatDateTime(itemAbgeschlossenAm);
            abgeschlossenValueClassName = "text-green-400";
        } else if (currentItemStatus === "Offen" || currentItemStatus === "In Bearbeitung" || currentItemStatus === null || currentItemStatus === undefined) {
            const displayStatus = currentItemStatus === "In Bearbeitung" ? "In Bearbeitung" : "Ausstehend";
            abgeschlossenText = displayStatus;
            abgeschlossenValueClassName = currentItemStatus === "In Bearbeitung" ? "text-amber-400 italic" : "text-slate-500 italic";
        } else if (currentItemStatus === "Gelöst" || currentItemStatus === "Abgelehnt") {
            abgeschlossenText = "Abgeschlossen (Datum n.a.)";
            abgeschlossenValueClassName = getStatusTextColorClass(currentItemStatus);
        }
    }

    const formElementBaseClass = "w-full p-2.5 text-sm rounded-md transition-colors duration-150 shadow-sm";
    const formInputTextClass = `${formElementBaseClass} bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:bg-slate-900/80 focus:border-sky-500 focus:ring-1 focus:ring-sky-500`;
    const formCheckboxRadioBaseClass = "h-4 w-4 rounded cursor-pointer transition-all duration-150 shadow";
    const formCheckboxRadioFocusClass = "focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 focus:ring-offset-slate-800";
    const formCheckboxClass = `${formCheckboxRadioBaseClass} bg-slate-700 border-slate-600 text-sky-500 ${formCheckboxRadioFocusClass}`;
    // const formRadioClass = `${formCheckboxRadioBaseClass} bg-slate-700 border-slate-600 text-sky-500 ${formCheckboxRadioFocusClass}`; // Nicht mehr direkt verwendet für Pill-Style

    const canFlip = currentView === 'beschwerden';

    return (
        <motion.div
            key={cardKey} variants={cardContainerVariants} initial="hidden" animate="visible" exit="exit" layout
            whileHover={!isFlipped || !canFlip ? { y: -8, scale: 1.02, rotateY: 0, boxShadow: "0px 10px 25px rgba(0,0,0,0.25), 0px 6px 10px rgba(0,0,0,0.22)", transition: { type: "spring", stiffness: 200, damping: 15 } } : {}}
            whileTap={!isFlipped || !canFlip ? { scale: 0.995, rotateY: 0, boxShadow: "0px 4px 12px rgba(0,0,0,0.18), 0px 2px 6px rgba(0,0,0,0.15)" } : {}}
            className={`relative overflow-hidden rounded-xl ${backgroundClass} backdrop-blur-md shadow-xl shadow-slate-900/30 flex flex-col justify-between`}
            style={{ perspective: '1000px' }}
        >
            <AnimatePresence mode="wait">
                {(!isFlipped || !canFlip) ? (
                    // VORDERSEITE
                    <motion.div key={`${cardKey}-front`} variants={flipContentVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col flex-grow">
                        <div className="p-4 md:p-5 flex flex-col flex-grow">
                            <motion.div variants={contentItemVariants} className="flex justify-between items-start mb-2.5">
                                <h3 className="text-md font-semibold text-slate-100 hover:text-white transition-colors break-words pr-2">
                                    {item.betreff || "Unbekannter Betreff"}
                                </h3>
                                <span className="text-xs text-slate-400 whitespace-nowrap ml-2 pt-0.5">ID: {itemTypePrefix}{item.id}</span>
                            </motion.div>

                            <motion.div variants={contentItemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 text-xs mb-1">
                                <DataField label="Name" value={item.name} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-name`} fieldKey={`${cardKey}-name`} />
                                <DataField label="Email" value={item.email} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-email`} fieldKey={`${cardKey}-email`} />
                                <DataField label="Tel." value={item.tel} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-tel`} fieldKey={`${cardKey}-tel`} />
                                <DataField label="Erstellt am" value={formatDateTime(item.erstelltam)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-erstelltam`} fieldKey={`${cardKey}-erstelltam`} copyValue={item.erstelltam} icon={ClockIcon} />
                                
                                {itemBearbeiterId !== null && itemBearbeiterId !== undefined && (
                                     <DataField label="Bearbeiter" value={String(itemBearbeiterName || `ID: ${itemBearbeiterId}`)} fieldKey={`${cardKey}-bearbeiter`} icon={UserIcon} />
                                )}

                                {isStatusRelevantView && (
                                    <DataField
                                        label="Status"
                                        value={currentItemStatus === null || currentItemStatus === undefined ? 'Nicht gesetzt' : currentItemStatus}
                                        onCopy={onCopyToClipboard}
                                        isCopied={copiedCellKey === `${cardKey}-status`} fieldKey={`${cardKey}-status`}
                                        valueClassName={getStatusTextColorClass(currentItemStatus)}
                                    />
                                )}
                                {isStatusRelevantView && abgeschlossenText !== null && (
                                    <DataField
                                        label="Bearbeitungsende" value={abgeschlossenText} fieldKey={`${cardKey}-abgeschlossen`}
                                        valueClassName={abgeschlossenValueClassName} icon={ClockIcon}
                                        onCopy={itemAbgeschlossenAm ? onCopyToClipboard : undefined}
                                        isCopied={itemAbgeschlossenAm ? (copiedCellKey === `${cardKey}-abgeschlossen`) : false}
                                        copyValue={itemAbgeschlossenAm || undefined}
                                    />
                                )}
                                
                                {currentView === 'beschwerden' && 'beschwerdegrund' in item && (
                                    <>
                                        <DataField label="Beschwerdegrund" value={(item as BeschwerdeItem).beschwerdegrund} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-grund`} fieldKey={`${cardKey}-grund`} />
                                        <DataField label="Vorfalldatum" value={formatDate((item as BeschwerdeItem).datum)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-vdatum`} fieldKey={`${cardKey}-vdatum`} copyValue={(item as BeschwerdeItem).datum} />
                                        <DataField label="Vorfallzeit" value={formatTime((item as BeschwerdeItem).uhrzeit)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-vzeit`} fieldKey={`${cardKey}-vzeit`} copyValue={(item as BeschwerdeItem).uhrzeit} />
                                        <DataField label="Linie" value={(item as BeschwerdeItem).linie} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-linie`} fieldKey={`${cardKey}-linie`} />
                                        <DataField label="Haltestelle" value={(item as BeschwerdeItem).haltestelle} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-hst`} fieldKey={`${cardKey}-hst`} />
                                    </>
                                )}
                            </motion.div>

                            <motion.div variants={contentItemVariants} className="mt-2 py-1 flex-grow flex flex-col">
                                <span className="text-xs text-slate-400 block mb-0.5">Beschreibung</span>
                                <div className="text-slate-200 text-xs whitespace-pre-wrap break-words max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600/70 scrollbar-track-slate-700/30 pt-1 pb-1 min-h-[40px] flex-grow">
                                    {item.beschreibung || <motion.span initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1, duration:0.4}} className="italic text-slate-500">Keine Beschreibung vorhanden.</motion.span>}
                                </div>
                            </motion.div>
                        </div>
                        {isStatusRelevantView && actionButton && (
                            <motion.div variants={contentItemVariants} className="px-4 md:px-5 pb-4 pt-2 border-t border-slate-700/60 mt-auto">
                                <div className={`flex ${canFlip ? 'justify-between' : 'justify-end'} items-center mb-2`}>
                                    {canFlip && (
                                        <motion.button 
                                            onClick={() => { setIsFlipped(true); setValidationError(null); }} 
                                            className="p-1.5 rounded-full text-slate-400 hover:text-sky-400 transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800" 
                                            title="Interne Details bearbeiten" 
                                            whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.9 }}
                                        >
                                            <Settings2Icon size={20} />
                                        </motion.button>
                                    )}
                                    <motion.button 
                                        onClick={handleToggleLock} 
                                        className={`p-1.5 rounded-full transition-colors duration-150 ease-in-out ${isLocked ? 'text-slate-400 hover:text-sky-400' : 'text-emerald-400 hover:text-emerald-300'} focus:outline-none focus-visible:ring-2 ${isLocked ? 'focus-visible:ring-sky-500' : 'focus-visible:ring-emerald-500'} focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800`} 
                                        title={isLocked ? "Bearbeitung entsperren" : "Bearbeitung sperren"} 
                                        animate={shakeLockAnim ? { x: [0, -8, 8, -6, 6, -4, 4, 0], scale: [1, 1.1, 1, 1.05, 1], transition: { duration: 0.4, ease: "easeInOut" }} : { x: 0, scale: 1 }} 
                                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    >
                                        {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                                    </motion.button>
                                </div>
                                {actionButton}
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    // RÜCKSEITE
                    <motion.div key={`${cardKey}-back`} variants={flipContentVariants} initial="initial" animate="animate" exit="exit" className="p-4 md:p-5 flex flex-col flex-grow justify-between">
                        {/* Scrollbarer Bereich für Formularinhalte */}
                        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600/70 scrollbar-track-slate-700/30 pr-1 pb-4 max-h-[calc(100%-8rem)]"> 
                            <motion.div variants={contentItemVariants} className="flex justify-between items-center pb-3 border-slate-700/80 mb-5 top-0 z-10 pt-3 -mt-1"> 
                                <h4 className="text-lg font-semibold text-slate-100 flex items-center">
                                    <MessageSquareTextIcon size={22} className="mr-2.5 text-sky-400 flex-shrink-0"/> Interne Bearbeitung
                                </h4>
                                <motion.button onClick={handleCancelInternalData} className="p-1.5 rounded-full text-slate-400 hover:text-sky-300 transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800" title="Abbrechen & Zurück" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                    <ArrowLeftIcon size={18} />
                                </motion.button>
                            </motion.div>

                            <FormSection title="Allgemeine Notizen" icon={StickyNoteIcon} htmlFor={`${cardKey}-generalNotes`}>
                                <textarea id={`${cardKey}-generalNotes`} value={internalDetails.generalNotes} onChange={e => handleInternalDetailChange('generalNotes', e.target.value)} rows={4} className={`${formInputTextClass} min-h-[80px]`} placeholder="Interne Vermerke, Beobachtungen, nächste Schritte..." />
                            </FormSection>

                            <FormSection title="Klärungsart" required icon={AlertCircleIcon}> {/* AlertCircleIcon als Beispiel für Pflichtfeld-Indikator */}
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                    {([
                                        {value: 'written', label: 'Schriftlich', icon: MailIcon },
                                        {value: 'phone', label: 'Telefonisch', icon: PhoneIcon }
                                    ] as const).map(type => { // 'as const' für strengere Typisierung von type.value
                                        const IconComponent = type.icon;
                                        return (
                                            <label key={type.value} className={`flex-1 flex items-center justify-center text-sm transition-all duration-150 cursor-pointer p-3 rounded-lg border-2 shadow-sm hover:shadow-md
                                                ${internalDetails.clarificationType === type.value
                                                    ? 'bg-sky-600/40 border-sky-500 text-sky-100 ring-1 ring-sky-500'
                                                    : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700/70 hover:border-slate-500 text-slate-300 hover:text-slate-100'
                                                }`}
                                            >
                                                <input type="radio" name={`${cardKey}-clarificationType`} checked={internalDetails.clarificationType === type.value} onChange={() => handleInternalDetailChange('clarificationType', type.value)} className="sr-only" />
                                                <IconComponent size={16} className={`mr-2 flex-shrink-0 ${internalDetails.clarificationType === type.value ? 'text-sky-300' : 'text-slate-400'}`} />
                                                {type.label}
                                            </label>
                                        );
                                    })}
                                </div>
                            </FormSection>

                            <FormSection title="Optionale interne Vermerke" icon={ListChecksIcon}>
                                <div className="space-y-1.5">
                                {[
                                    { key: 'teamLeadInformed', label: 'Teamleiter informiert' },
                                    { key: 'departmentHeadInformed', label: 'Geschäftsbereichsleiter informiert' },
                                    { key: 'forwardedToSubcontractor', label: 'Weiterleitung an Nachauftraggeber' },
                                    { key: 'forwardedToInsurance', label: 'Weiterleitung an Versicherungsabteilung' },
                                ].map(opt => (
                                    <label key={opt.key} className="flex items-center text-sm text-slate-200 hover:text-sky-300 transition-colors cursor-pointer p-2.5 rounded-md hover:bg-slate-700/50 border border-transparent hover:border-slate-600">
                                        <input type="checkbox" checked={!!internalDetails[opt.key as keyof InternalCardData]} onChange={e => handleInternalDetailChange(opt.key as keyof InternalCardData, e.target.checked)} className={`mr-2.5 ${formCheckboxClass}`} />
                                        {opt.label}
                                    </label>
                                ))}
                                </div>
                            </FormSection>
                            
                            <FormSection icon={CreditCardIcon}> {/* Kein Titel, nur Icon als visueller Hinweis */}
                                <label className="flex items-center text-sm text-slate-200 hover:text-sky-300 transition-colors cursor-pointer p-2.5 rounded-md hover:bg-slate-700/50 border border-transparent hover:border-slate-600">
                                    <input type="checkbox" checked={internalDetails.moneyRefunded} onChange={e => handleInternalDetailChange('moneyRefunded', e.target.checked)} className={`mr-2.5 ${formCheckboxClass}`} />
                                    Geld erstattet
                                </label>
                                <AnimatePresence>
                                    {internalDetails.moneyRefunded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem' }} // mt-3
                                            exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom:0 }}
                                            className="pl-7"> {/* Einzug für den Betrag */}
                                            <label htmlFor={`${cardKey}-refundAmount`} className="block text-xs font-medium text-slate-300 mb-1.5">Erstatteter Betrag (€) <span className="text-red-400">*</span>:</label>
                                            <input type="number" id={`${cardKey}-refundAmount`} value={internalDetails.refundAmount} onChange={e => handleInternalDetailChange('refundAmount', e.target.value)} placeholder="z.B. 10.50" className={`${formInputTextClass} text-sm`} min="0.01" step="0.01" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </FormSection>
                        </div>

                        {/* Buttons und Validierungsfehler am unteren Rand */}
                        <div className="mt-auto pt-4 border-t border-slate-700/60">
                            {validationError && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-3 p-2.5 text-xs text-red-200 bg-red-800/50 rounded-md flex items-center shadow">
                                    <AlertCircleIcon size={16} className="mr-2 flex-shrink-0" />
                                    {validationError}
                                </motion.div>
                            )}
                            <motion.div variants={contentItemVariants} className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                                <motion.button onClick={handleCancelInternalData} className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-200 bg-slate-600 hover:bg-slate-500 transition-colors flex items-center justify-center shadow-md hover:shadow-lg" whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                                    <XCircleIcon size={16} className="mr-1.5" /> Abbrechen
                                </motion.button>
                                <motion.button onClick={handleSaveInternalData} className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-sky-600 hover:bg-sky-500 transition-colors flex items-center justify-center shadow-md hover:shadow-lg" whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                                    <SaveIcon size={16} className="mr-1.5" /> Speichern
                                </motion.button>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}