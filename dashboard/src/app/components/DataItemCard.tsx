"use client";

import { motion, AnimatePresence } from 'framer-motion'; // AnimatePresence hinzugefügt
import { CopyIcon, CheckIcon, ClockIcon, Lock, Unlock, UserIcon, Settings2Icon, ArrowLeftIcon, SaveIcon, XCircleIcon } from 'lucide-react'; // UserIcon ist schon da, gut! // Settings2Icon, ArrowLeftIcon, SaveIcon, XCircleIcon hinzugefügt
import { useState, useEffect } from 'react';
import { DataItem, BeschwerdeItem, ViewType, AnyItemStatus } from '../types'; // Stellen Sie sicher, dass DataItem ggf. um internal_notes und internal_options erweitert wird
import { formatDate, formatTime, formatDateTime } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../constants';

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

const cardContainerVariants = {
    hidden: { opacity: 0, y: 60, scale: 0.9, rotateX: -20, transformPerspective: 1000 },
    visible: { opacity: 1, y: 0, scale: 1, rotateX: 0, transition: { type: "spring", stiffness: 120, damping: 20, staggerChildren: 0.08, delayChildren: 0.1 } },
    exit: { opacity: 0, scale: 0.85, transition: { duration: 0.2, ease: "easeOut" } }
};

const contentItemVariants = {
    hidden: { opacity: 0, x: -25, scale: 0.85 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 180, damping: 20 } }
};

// NEU: Animation für den Wechsel zwischen Vorder- und Rückseite
const flipContentVariants = {
    initial: { opacity: 0, rotateY: -90 },
    animate: { opacity: 1, rotateY: 0, transition: { duration: 0.4, ease: "easeInOut" } },
    exit: { opacity: 0, rotateY: 90, transition: { duration: 0.3, ease: "easeInOut" } },
};

interface DataItemCardProps {
    item: DataItem & {
        action_required?: "relock_ui",
        // NEU: Optionale Felder für die Daten der Rückseite. Diese sollten in Ihrer `DataItem` Typdefinition vorhanden sein.
        internal_notes?: string;
        internal_options?: Record<string, boolean>;
    };
    currentView: ViewType;
    copiedCellKey: string | null;
    onCopyToClipboard: (textToCopy: string, cellKey: string) => void;
    onStatusChange: (itemId: number, newStatus: AnyItemStatus, itemType: ViewType) => void;
    cardAccentsEnabled: boolean;
    onItemUpdate: (updatedItem: DataItem & { // Prop ist hier korrekt definiert
        action_required?: "relock_ui",
        internal_notes?: string;
        internal_options?: Record<string, boolean>;
    }) => void;
}

export default function DataItemCard({
    item, currentView, copiedCellKey, onCopyToClipboard, onStatusChange, cardAccentsEnabled, onItemUpdate // << onItemUpdate jetzt hier destrukturieren
}: DataItemCardProps) {
    const itemTypePrefix = currentView === "beschwerden" ? "CMP-" : currentView === "lob" ? "LOB-" : "ANG-";
    const { user, token } = useAuth();

    const [isLocked, setIsLocked] = useState(true);
    const [shakeLockAnim, setShakeLockAnim] = useState(false);

    // NEU: State für die Anzeige der Rückseite
    const [isFlipped, setIsFlipped] = useState(false);
    // NEU: State für die Daten der Rückseite, initialisiert mit Werten aus `item` oder Defaults
    const [internalNotes, setInternalNotes] = useState(item.internal_notes || "");
    const [internalOptions, setInternalOptions] = useState<Record<string, boolean>>(
        item.internal_options || {
            // Beispiel-Optionen. Passen Sie diese an Ihre Bedürfnisse an.
            optionFollowUp: false,
            optionRequiresAttention: false,
            optionArchived: false,
        }
    );

    let currentItemStatus: AnyItemStatus | undefined | null;
    let itemAbgeschlossenAm: string | null | undefined;
    let itemBearbeiterId: number | null | undefined = undefined;
    let itemBearbeiterName: string | null | undefined = undefined;


    const isStatusRelevantView = currentView === 'beschwerden' || currentView === 'lob' || currentView === 'anregungen';

    if (item && 'bearbeiter_id' in item) {
        itemBearbeiterId = item.bearbeiter_id;
    }
    if (item && 'bearbeiter_name' in item) { // << NEU (war schon in Ihrem Code, gut!)
        itemBearbeiterName = item.bearbeiter_name;
    }
    if (item && 'status' in item) {
        currentItemStatus = item.status as AnyItemStatus | undefined | null;
    }
    if (item && 'abgeschlossenam' in item) {
        itemAbgeschlossenAm = item.abgeschlossenam;
    }


    // useEffect für automatisches Sperren
    useEffect(() => {
        if (
            isStatusRelevantView &&
            item.status === "Offen" &&
            item.bearbeiter_id === null &&
            !isLocked && // Nur wenn Schloss aktuell offen ist
            item.action_required === "relock_ui"
        ) {
            console.log(`DataItemCard ID ${item.id}: Aktion "relock_ui" empfangen. Schloss wird gesperrt.`);
            setIsLocked(true);
        }
    }, [item.status, item.bearbeiter_id, item.action_required, isLocked, isStatusRelevantView, item.id]);

    // NEU: Effekt um Rückseiten-Daten zu aktualisieren, wenn `item` sich von außen ändert
    useEffect(() => {
        setInternalNotes(item.internal_notes || "");
        setInternalOptions(item.internal_options || { optionFollowUp: false, optionRequiresAttention: false, optionArchived: false });
    }, [item.internal_notes, item.internal_options, item.id]); // item.id hinzugefügt, falls sich das Item komplett ändert


    const handleToggleLock = async () => {
        const wasLocked = isLocked;
        const newLockState = !wasLocked;
        setIsLocked(newLockState); // Optimistisches UI-Update

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
                    setIsLocked(true); // Rollback UI-Update
                    triggerShakeLock(); // Signalisiere Fehler am Schloss
                    return;
                }

                const updatedItemFromServer = await response.json();
                console.log(`DataItemCard ID ${item.id}: Bearbeiter erfolgreich zugewiesen. Antwort:`, updatedItemFromServer);
                onItemUpdate(updatedItemFromServer); // Informiere Parent über Update

            } catch (err) {
                console.error(`DataItemCard ID ${item.id}: Schwerer Fehler beim Zuweisen des Bearbeiters:`, err);
                setIsLocked(true); // Rollback UI-Update
                triggerShakeLock();
            }
        }
    };

    const triggerShakeLock = () => {
        setShakeLockAnim(true);
        setTimeout(() => setShakeLockAnim(false), 400);
    };

    const handleProtectedStatusChange = (itemId: number, newStatus: AnyItemStatus, viewForApi: ViewType) => {
        if (isLocked && !isFlipped) { // MODIFIZIERT: Sperre nur auf Vorderseite relevant
            triggerShakeLock();
        } else {
            onStatusChange(itemId, newStatus, viewForApi);
        }
    };

    // NEU: Handler für Änderungen auf der Rückseite
    const handleInternalNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInternalNotes(e.target.value);
    };

    const handleInternalOptionChange = (optionKey: string) => {
        setInternalOptions(prev => ({ ...prev, [optionKey]: !prev[optionKey] }));
    };

    // NEU: Handler zum Speichern der Daten der Rückseite
    const handleSaveInternalData = () => {
        const updatedItemWithInternalData = {
            ...item,
            internal_notes: internalNotes,
            internal_options: internalOptions,
        };
        onItemUpdate(updatedItemWithInternalData);
        setIsFlipped(false); // Zurück zur Vorderseite
        console.log(`DataItemCard ID ${item.id}: Interne Daten gespeichert und an Parent übergeben.`);
    };

    // NEU: Handler zum Abbrechen der Bearbeitung auf der Rückseite
    const handleCancelInternalData = () => {
        // Setze auf ursprüngliche Werte aus `item` zurück
        setInternalNotes(item.internal_notes || "");
        setInternalOptions(item.internal_options || { optionFollowUp: false, optionRequiresAttention: false, optionArchived: false });
        setIsFlipped(false); // Zurück zur Vorderseite
    };


    let actionButton = null;
    let effectiveStatusForButtons: AnyItemStatus = "Offen";
    // ... (actionButton Logik bleibt identisch, verwendet handleProtectedStatusChange) ...
    if (isStatusRelevantView) {
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
    const statusForAccent = currentItemStatus || effectiveStatusForButtons;
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

    // NEU: Button zum Wechseln der Kartenansicht (Vorder-/Rückseite)
    const flipCardButton = (
        <motion.button
            onClick={() => setIsFlipped(!isFlipped)}
            className={`p-1.5 rounded-full transition-colors duration-150 ease-in-out absolute top-3 right-3 z-20 
                        ${isFlipped ? 'text-slate-300 hover:text-sky-300' : 'text-slate-400 hover:text-sky-400'}
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800`}
            title={isFlipped ? "Zurück zur Detailansicht" : "Interne Notizen/Optionen bearbeiten"}
            whileHover={{ scale: 1.1, rotate: isFlipped ? 0 : 15 }}
            whileTap={{ scale: 0.9 }}
            aria-label={isFlipped ? "Zurück zur Detailansicht" : "Interne Notizen und Optionen bearbeiten"}
        >
            {isFlipped ? <ArrowLeftIcon size={18} /> : <Settings2Icon size={18} />}
        </motion.button>
    );

    return (
        <motion.div
            key={cardKey} variants={cardContainerVariants} initial="hidden" animate="visible" exit="exit" layout
            // MODIFIZIERT: Hover/Tap Effekte nur auf Vorderseite
            whileHover={!isFlipped ? { y: -8, scale: 1.02, rotateY: 0, boxShadow: "0px 10px 25px rgba(0,0,0,0.25), 0px 6px 10px rgba(0,0,0,0.22)", transition: { type: "spring", stiffness: 200, damping: 15 } } : {}}
            whileTap={!isFlipped ? { scale: 0.995, rotateY: 0, boxShadow: "0px 4px 12px rgba(0,0,0,0.18), 0px 2px 6px rgba(0,0,0,0.15)" } : {}}
            className={`relative overflow-hidden rounded-xl ${backgroundClass} backdrop-blur-md shadow-lg shadow-slate-900/25 flex flex-col justify-between`}
            style={{ perspective: '1000px' }} // NEU: Für 3D-Effekt des Inhalts-Flips
        >
            {/* NEU: Flip-Button wird hier gerendert, wenn relevant */}
            {isStatusRelevantView && flipCardButton}

            <AnimatePresence mode="wait">
                {!isFlipped ? (
                    // VORDERSEITE (Ihr bestehender Inhalt)
                    <motion.div
                        key={`${cardKey}-front`}
                        variants={flipContentVariants} // Nutzt die neue Flip-Animation
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="flex flex-col flex-grow" // Stellt sicher, dass der Inhalt den Raum füllt
                    >
                        <div className="p-4 md:p-5 flex flex-col flex-grow"> {/* cursor-pointer entfernt, da Interaktion über Buttons */}
                            <motion.div variants={contentItemVariants} className="flex justify-between items-start mb-2.5">
                                <h3 className="text-md font-semibold text-slate-100 hover:text-white transition-colors break-words pr-10"> {/* pr-10 für Platz für Flip-Button */}
                                    {item.betreff || "Unbekannter Betreff"}
                                </h3>
                                <span className="text-xs text-slate-400 whitespace-nowrap ml-2 pt-0.5">ID: {itemTypePrefix}{item.id}</span>
                            </motion.div>

                            <motion.div variants={contentItemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 text-xs mb-1">
                                <DataField label="Name" value={item.name} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-name`} fieldKey={`${cardKey}-name`} />
                                <DataField label="Email" value={item.email} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-email`} fieldKey={`${cardKey}-email`} />
                                <DataField label="Tel." value={item.tel} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-tel`} fieldKey={`${cardKey}-tel`} />
                                <DataField label="Erstellt am" value={formatDateTime(item.erstelltam)} onCopy={onCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-erstelltam`} fieldKey={`${cardKey}-erstelltam`} copyValue={item.erstelltam} icon={ClockIcon} />

                                {/* ANZEIGE BEARBEITER-ID */}
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
                                    {item.beschreibung ? item.beschreibung :
                                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }} className="italic text-slate-500">
                                            Keine Beschreibung vorhanden.
                                        </motion.span>
                                    }
                                </div>
                            </motion.div>
                        </div>

                        {isStatusRelevantView && actionButton && (
                            <motion.div
                                variants={contentItemVariants}
                                className="px-4 md:px-5 pb-4 pt-2 border-t border-slate-700/50 mt-auto"
                            >
                                <div className="flex justify-end items-center mb-2">
                                    <motion.button
                                        onClick={handleToggleLock}
                                        className={`p-1.5 rounded-full transition-colors duration-150 ease-in-out
                                            ${isLocked ? 'text-slate-400 hover:text-sky-400' : 'text-emerald-400 hover:text-emerald-300'}
                                            focus:outline-none focus-visible:ring-2 ${isLocked ? 'focus-visible:ring-sky-500' : 'focus-visible:ring-emerald-500'} focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800`}
                                        title={isLocked ? "Bearbeitung entsperren" : "Bearbeitung sperren"}
                                        animate={shakeLockAnim ? {
                                            x: [0, -8, 8, -6, 6, -4, 4, 0],
                                            scale: [1, 1.1, 1, 1.05, 1], // Korrigierte Skalierung
                                            transition: { duration: 0.4, ease: "easeInOut" }
                                        } : {
                                            x: 0,
                                            scale: 1
                                        }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                                    </motion.button>
                                </div>
                                {actionButton}
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    // RÜCKSEITE DER KARTE (NEUER INHALT)
                    <motion.div
                        key={`${cardKey}-back`}
                        variants={flipContentVariants} // Nutzt die neue Flip-Animation
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="p-4 md:p-5 flex flex-col flex-grow justify-between" // Stellt sicher, dass der Inhalt den Raum füllt und Buttons unten sind
                    >
                        {/* Inhalt der Rückseite */}
                        <div>
                            <motion.h4 variants={contentItemVariants} className="text-md font-semibold text-slate-100 mb-3 pr-8"> {/* pr-8 für Platz für Flip-Button */}
                                Interne Notizen & Optionen
                            </motion.h4>

                            <motion.div variants={contentItemVariants} className="mb-4">
                                <label htmlFor={`${cardKey}-internal-notes`} className="block text-xs text-slate-400 mb-1">Interne Notizen:</label>
                                <textarea
                                    id={`${cardKey}-internal-notes`}
                                    value={internalNotes}
                                    onChange={handleInternalNotesChange}
                                    rows={5} // Etwas mehr Platz
                                    className="w-full p-2 text-sm bg-slate-700/60 text-slate-100 rounded-md border border-slate-600 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 scrollbar-thin scrollbar-thumb-slate-500/70 scrollbar-track-slate-700/40"
                                    placeholder="Vermerke, nächste Schritte, etc."
                                />
                            </motion.div>

                            <motion.div variants={contentItemVariants} className="mb-4">
                                <span className="block text-xs text-slate-400 mb-1.5">Optionen:</span>
                                <div className="space-y-1.5">
                                    {Object.keys(internalOptions).map(optionKey => (
                                        <label key={optionKey} className="flex items-center text-sm text-slate-200 hover:text-sky-300 transition-colors cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={internalOptions[optionKey]}
                                                onChange={() => handleInternalOptionChange(optionKey)}
                                                className="mr-2.5 h-4 w-4 rounded bg-slate-600 border-slate-500 text-sky-500 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 cursor-pointer"
                                            />
                                            {/* Beispielhafte Labels - anpassen! */}
                                            {optionKey === 'optionFollowUp' && 'Follow-Up benötigt'}
                                            {optionKey === 'optionRequiresAttention' && 'Besondere Aufmerksamkeit'}
                                            {optionKey === 'optionArchived' && 'Für Archiv markiert'}
                                            {/* Fallback, falls Label nicht definiert */}
                                            {!['optionFollowUp', 'optionRequiresAttention', 'optionArchived'].includes(optionKey) && optionKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </label>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* Aktionsbuttons für die Rückseite */}
                        <motion.div variants={contentItemVariants} className="flex justify-end space-x-2 mt-auto pt-3 border-t border-slate-700/50">
                            <motion.button
                                onClick={handleCancelInternalData}
                                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-300 bg-slate-600/70 hover:bg-slate-600/90 transition-colors flex items-center shadow hover:shadow-md"
                                whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                            >
                                <XCircleIcon size={16} className="mr-1.5" /> Abbrechen
                            </motion.button>
                            <motion.button
                                onClick={handleSaveInternalData}
                                className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-sky-600 hover:bg-sky-500 transition-colors flex items-center shadow hover:shadow-md"
                                whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                            >
                                <SaveIcon size={16} className="mr-1.5" /> Speichern
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}