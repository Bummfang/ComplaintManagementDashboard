"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CardSpecificDataItem, ViewType, AnyItemStatus as StrictStatus, BeschwerdeItem } from '@/app/types'; 
import { useAuth } from '@/app/contexts/AuthContext'; 
import { API_ENDPOINTS } from '@/app/constants'; // Wird für handleRemoveAttachment benötigt

import CardFront from './CardFront';
import CardBack from './CardBack';
import CardActions from './CardActions';
import { useInternalDetails } from './hooks/useInternalDetails';
import { useItemLocking } from './hooks/useItemLocking';
import { useStatusLogic, getCardBackgroundAccentClasses } from './hooks/useStatusLogic';

import {
    cardContainerVariants,
    flipContentVariantsFront,
    flipContentVariantsBack
} from './variants';

export interface DataItemCardProps {
    item: CardSpecificDataItem;
    currentView: ViewType;
    copiedCellKey: string | null;
    onCopyToClipboard: (textToCopy: string, cellKey: string) => void;
    onStatusChange: (itemId: number, newStatus: StrictStatus, itemType: ViewType) => void;
    cardAccentsEnabled: boolean;
    // WICHTIG: onItemUpdate akzeptiert jetzt optional eine Datei und gibt ein Promise zurück
    onItemUpdate: (updatedItem: CardSpecificDataItem, file?: File | null) => Promise<void>; 
}

export default function DataItemCard({
    item,
    currentView,
    copiedCellKey,
    onCopyToClipboard,
    onStatusChange,
    cardAccentsEnabled,
    onItemUpdate,
}: DataItemCardProps) {
    const { user, token } = useAuth(); // token wird für handleRemoveAttachment benötigt
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
    
    // NEU: State für Ladeanzeige während Upload/Löschen der PDF
    const [isProcessingFile, setIsProcessingFile] = useState(false);

    const {
        isStatusRelevantView,
        effectiveStatus,
        statusTextColorClass,
        abgeschlossenText,
        abgeschlossenValueClassName,
    } = useStatusLogic({ item, currentView });

    const {
        internalDetails,
        validationError,
        handleInternalDetailChange,
        validateAndPrepareSaveData,
        resetInternalDetails,
        clearValidationError
    } = useInternalDetails(item.internal_details);

    const {
        isLocked,
        setIsLocked,
        shakeLockAnim,
        handleToggleLock,
        triggerShakeLock,
        isAssigning,
    } = useItemLocking({
        item,
        initialLockedState: !(item.bearbeiter_id && user && item.bearbeiter_id === user.userId),
        // onItemUpdate von useItemLocking sollte jetzt auch ein Promise sein, wenn es onItemUpdate aufruft.
        // Wir nehmen an, dass onItemUpdate aus den Props das schon ist.
        onItemUpdate: async (updatedItemFromLocking) => {
            try {
                await onItemUpdate(updatedItemFromLocking, selectedPdfFile);
            } catch (error) {
                console.error("Fehler bei onItemUpdate durch useItemLocking:", error);
                // Ggf. Fehlerbehandlung, falls das Promise von onItemUpdate rejectet
            }
        },
        currentView,
    });

    const canFlip = useMemo(() => currentView === 'beschwerden', [currentView]);
    const isFinalized = useMemo(() => effectiveStatus === "Gelöst" || effectiveStatus === "Abgelehnt", [effectiveStatus]);
    const isClarificationMissingInSavedDetails = useMemo(() => {
        if (canFlip) {
            return !item.internal_details?.clarificationType;
        }
        return false;
    }, [item.internal_details, canFlip]);

    useEffect(() => {
        if (isFlipped) clearValidationError();
    }, [item.internal_details, isFlipped, clearValidationError]);

    useEffect(() => {
        if (isStatusRelevantView && (item.status === "Offen" || item.status === undefined) && item.bearbeiter_id === null && item.action_required === "relock_ui" && !isLocked ) {
            setIsLocked(true);
        }
    }, [item.status, item.bearbeiter_id, item.action_required, isStatusRelevantView, setIsLocked, isLocked]);

    const handleFileSelectForCard = useCallback((file: File | null) => {
        setSelectedPdfFile(file);
    }, []);
    
    // NEU: Funktion für direkten PDF-Upload
    const handleUploadFile = useCallback(async () => {
        if (!selectedPdfFile) return;
        if (typeof onItemUpdate !== 'function') {
            console.error("onItemUpdate ist keine Funktion in DataItemCard");
            return;
        }
        setIsProcessingFile(true);
        try {
            await onItemUpdate(item, selectedPdfFile); // Übergibt das aktuelle Item und die neue Datei
            // Elternkomponente ist verantwortlich für das Update des 'item' mit neuem attachment_filename
            // und das Zurücksetzen von selectedPdfFile hier ist gut, da der Upload gestartet wurde.
            setSelectedPdfFile(null); 
        } catch (error) {
            console.error(`DataItemCard ID ${item.id}: Fehler beim Initiieren des Datei-Uploads:`, error);
            // Hier könnte eine Fehlermeldung für den Benutzer angezeigt werden
        } finally {
            setIsProcessingFile(false);
        }
    }, [item, selectedPdfFile, onItemUpdate, setSelectedPdfFile]);

    // NEU: Funktion zum Löschen eines serverseitigen Anhangs
    const handleRemoveAttachment = useCallback(async () => {
        if (currentView !== 'beschwerden' || typeof item.id !== 'number' || !(item as BeschwerdeItem).attachment_filename) {
            return;
        }
        if (!token) {
            console.error("Kein Authentifizierungstoken für Löschvorgang vorhanden.");
            return;
        }
         if (typeof onItemUpdate !== 'function') {
            console.error("onItemUpdate ist keine Funktion in DataItemCard (für remove)");
            return;
        }

        setIsProcessingFile(true);
        try {
            const beschwerdenApiBase = API_ENDPOINTS.beschwerden;
            if (!beschwerdenApiBase) throw new Error("Beschwerden API Endpunkt nicht definiert.");

            const response = await fetch(`${beschwerdenApiBase}/${item.id}/attachment`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Leeres Objekt bei Fehler
                throw new Error(errorData.message || `Fehler ${response.status} beim Löschen des Anhangs.`);
            }
            
            // Informiere die Elternkomponente, das Item zu aktualisieren (ohne Anhangsinfo)
            // Das 'file'-Argument ist `undefined` oder `null`, um anzuzeigen, dass es entfernt wurde
            await onItemUpdate({ ...item, attachment_filename: null, attachment_mimetype: null } as CardSpecificDataItem, undefined);

        } catch (error) {
            console.error(`DataItemCard ID ${item.id}: Fehler beim Löschen des Anhangs:`, error);
        } finally {
            setIsProcessingFile(false);
        }
    }, [item, currentView, token, onItemUpdate]);

    const handleSaveInternal = useCallback(async () => {
        if (isFinalized) return;
        const validData = validateAndPrepareSaveData();
        if (validData) {
            const updatedItemWithInternalDetails: CardSpecificDataItem = { ...item, internal_details: validData };
            setIsProcessingFile(true); 
            try {
                await onItemUpdate(updatedItemWithInternalDetails, selectedPdfFile);
                setSelectedPdfFile(null); 
                setIsFlipped(false);
            } catch (error) {
                console.error(`DataItemCard ID ${item.id}: Fehler beim Speichern der internen Details mit Datei:`, error);
            } finally {
                setIsProcessingFile(false);
            }
        }
    }, [item, selectedPdfFile, isFinalized, validateAndPrepareSaveData, onItemUpdate, setSelectedPdfFile, setIsFlipped]);

    const handleCancelInternal = useCallback(() => {
        resetInternalDetails(item.internal_details);
        setIsFlipped(false);
    }, [item.internal_details, resetInternalDetails, setIsFlipped]);

    const handleProtectedStatusChange = useCallback(async (newStatus: StrictStatus) => {
        if (isLocked || isProcessingFile && !isFlipped ) { // Auch sperren wenn Datei verarbeitet wird
            triggerShakeLock();
            return;
        }
        if (canFlip && (newStatus === "Gelöst" || newStatus === "Abgelehnt")) {
            const validatedInternalDataFromHook = validateAndPrepareSaveData();
            if (!validatedInternalDataFromHook) {
                setIsFlipped(true);
                return;
            }
            // Wenn Status auf "Gelöst" oder "Abgelehnt" gesetzt wird und interne Details validiert sind,
            // werden diese Details (und eine evtl. ausgewählte Datei) zuerst gespeichert.
            setIsProcessingFile(true);
            try {
                await onItemUpdate({ ...item, internal_details: validatedInternalDataFromHook, status: newStatus }, selectedPdfFile);
                setSelectedPdfFile(null);
                // onStatusChange wird hier nicht mehr separat aufgerufen, da onItemUpdate den Status setzen sollte.
                // Stelle sicher, dass dein Backend und onItemUpdate dies handhaben.
            } catch (error) {
                console.error(`DataItemCard ID ${item.id}: Fehler beim Speichern vor Statuswechsel zu ${newStatus}:`, error);
            } finally {
                setIsProcessingFile(false);
            }
            return; // Wichtig, um das folgende onStatusChange zu verhindern, wenn onItemUpdate den Status schon setzt
        }
        // Für andere Statusänderungen, die nicht "Gelöst" oder "Abgelehnt" sind (z.B. "In Bearbeitung")
        onStatusChange(item.id, newStatus, currentView);
    }, [isLocked, isProcessingFile, isFlipped, triggerShakeLock, canFlip, validateAndPrepareSaveData, setIsFlipped, item, currentView, onStatusChange, selectedPdfFile, onItemUpdate, setSelectedPdfFile]);
    
    const itemTypePrefix = useMemo(() => currentView === "beschwerden" ? "CMP-" : currentView === "lob" ? "LOB-" : "ANG-", [currentView]);
    const cardKey = `dataitemcard-${currentView}-${item.id}`;
    const resolvedBackgroundClass = cardAccentsEnabled && isStatusRelevantView && effectiveStatus ? getCardBackgroundAccentClasses(effectiveStatus) : getCardBackgroundAccentClasses(undefined);
    const statusToDisplayForFront = effectiveStatus || (isStatusRelevantView ? "Offen" : "N/A");

    return (
        <motion.div key={cardKey} variants={cardContainerVariants} initial="hidden" animate="visible" exit="exit" layout
            className={`relative rounded-xl ${resolvedBackgroundClass} backdrop-blur-md shadow-xl shadow-slate-900/30 flex flex-col justify-between overflow-hidden`}
            style={{ perspective: '1000px' }}
            whileHover={!isFlipped || !canFlip ? { y: -8, scale: 1.02, boxShadow: "0px 10px 25px rgba(0,0,0,0.25), 0px 6px 10px rgba(0,0,0,0.22)", transition: { type: "spring", stiffness: 200, damping: 15 } } : {}}
            whileTap={!isFlipped || !canFlip ? { scale: 0.995, boxShadow: "0px 4px 12px rgba(0,0,0,0.18), 0px 2px 6px rgba(0,0,0,0.15)" } : {}} >
            <AnimatePresence mode="wait" initial={false}>
                {(!isFlipped || !canFlip) ? (
                    <motion.div key={`${cardKey}-frontface`} variants={flipContentVariantsFront} initial="initial" animate="animate" exit="exit" className="flex flex-col flex-grow" >
                        <CardFront
                            item={item}
                            currentView={currentView}
                            copiedCellKey={copiedCellKey}
                            onCopyToClipboard={onCopyToClipboard}
                            itemTypePrefix={itemTypePrefix}
                            abgeschlossenText={abgeschlossenText}
                            abgeschlossenValueClassName={abgeschlossenValueClassName}
                            isStatusRelevantView={isStatusRelevantView}
                            statusDisplayClass={statusTextColorClass}
                            statusToDisplay={statusToDisplayForFront}
                            selectedFile={selectedPdfFile}
                            onFileSelect={handleFileSelectForCard}
                            isLocked={isLocked || isAssigning || isProcessingFile}
                            // --- NEUE/AKTUALISIERTE PROPS ---
                            onUploadSelectedFile={handleUploadFile} 
                            isUploadingFile={isProcessingFile} // Umbenannt zu isProcessingFile für Konsistenz
                            onRemoveAttachment={currentView === 'beschwerden' ? handleRemoveAttachment : undefined}
                        />
                        {isStatusRelevantView && effectiveStatus && (
                            <div className="px-4 md:px-5 pb-4 pt-1 border-t border-slate-700/60 mt-auto">
                                <CardActions 
                                    status={effectiveStatus} 
                                    isLocked={isLocked || isAssigning || isProcessingFile} 
                                    canFlip={canFlip} 
                                    onStatusChange={handleProtectedStatusChange} 
                                    onToggleLock={handleToggleLock}
                                    onFlip={() => { if ((isLocked || isAssigning || isProcessingFile) && canFlip) { triggerShakeLock(); return; } if (canFlip) { clearValidationError(); setIsFlipped(true); }}}
                                    shakeLockAnim={shakeLockAnim} 
                                    isAssigning={isAssigning} 
                                    isClarificationMissingInSavedDetails={isClarificationMissingInSavedDetails} 
                                    currentView={currentView} 
                                />
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key={`${cardKey}-backface`} variants={flipContentVariantsBack} initial="initial" animate="animate" exit="exit" className="flex flex-col flex-grow h-full" >
                        <CardBack 
                            internalDetails={internalDetails} 
                            onDetailChange={handleInternalDetailChange} 
                            onSave={handleSaveInternal} 
                            onCancel={handleCancelInternal}
                            validationError={validationError} 
                            cardKey={cardKey} 
                            isSubmitting={isAssigning || isProcessingFile} // Auch hier isProcessingFile für den Ladezustand
                            isFinalized={isFinalized} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}