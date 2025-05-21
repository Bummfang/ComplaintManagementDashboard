// ./src/app/components/DataItemCard/DataItemCard.tsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CardSpecificDataItem, ViewType, AnyItemStatus as StrictStatus, BeschwerdeItem } from '@/app/types';
import { useAuth } from '@/app/contexts/AuthContext';
import { API_ENDPOINTS } from '@/app/constants';

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
    const { user, token } = useAuth();
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
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
        onItemUpdate: async (updatedItemFromLocking) => {
            setIsProcessingFile(true);
            try {
                await onItemUpdate(updatedItemFromLocking, undefined);
            } catch (error) {
                console.error("Fehler bei onItemUpdate durch useItemLocking:", error);
            } finally {
                setIsProcessingFile(false);
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
        if (isFinalized) return;
        setSelectedPdfFile(file);
    }, [isFinalized]);

    const handleUploadFile = useCallback(async () => {
        if (isFinalized) return;
        if (!selectedPdfFile) {
            console.warn(`DataItemCard ID ${item.id}: Keine Datei zum Hochladen ausgewählt.`);
            return;
        }
        if (typeof onItemUpdate !== 'function') {
            console.error(`DataItemCard ID ${item.id}: onItemUpdate Prop ist keine Funktion.`);
            return;
        }
        setIsProcessingFile(true);
        try {
            await onItemUpdate(item, selectedPdfFile);
            setSelectedPdfFile(null);
        } catch (error) { console.error(`DataItemCard ID ${item.id}: Fehler beim Initiieren des Datei-Uploads:`, error); }
        finally { setIsProcessingFile(false); }
    }, [item, selectedPdfFile, onItemUpdate, setSelectedPdfFile, isFinalized]);

    const handleRemoveAttachment = useCallback(async () => {
        if (isFinalized) return;
        if (currentView !== 'beschwerden' || typeof item.id !== 'number' || !(item as BeschwerdeItem).attachment_filename) return;
        if (!token) { console.error("Kein Authentifizierungstoken für Löschvorgang vorhanden."); return; }
        if (typeof onItemUpdate !== 'function') { console.error("onItemUpdate ist keine Funktion (für remove)."); return; }
        setIsProcessingFile(true);
        try {
            const beschwerdenApiBase = API_ENDPOINTS.beschwerden;
            if (!beschwerdenApiBase) throw new Error("Beschwerden API Endpunkt nicht definiert.");
            const response = await fetch(`${beschwerdenApiBase}/${item.id}/attachment`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Fehler ohne JSON-Body" }));
                throw new Error(errorData.message || `Fehler ${response.status} beim Löschen des Anhangs serverseitig.`);
            }
            await onItemUpdate({ ...item, attachment_filename: null, attachment_mimetype: null } as CardSpecificDataItem, undefined);
        } catch (error) { console.error(`DataItemCard ID ${item.id}: Fehler beim Löschen des Anhangs:`, error); }
        finally { setIsProcessingFile(false); }
    }, [item, currentView, token, onItemUpdate, isFinalized]);

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
            } catch (error) { console.error(`DataItemCard ID ${item.id}: Fehler beim Speichern der internen Details mit Datei:`, error); }
            finally { setIsProcessingFile(false); }
        }
    }, [item, selectedPdfFile, isFinalized, validateAndPrepareSaveData, onItemUpdate, setSelectedPdfFile, setIsFlipped]);

    const handleCancelInternal = useCallback(() => {
        resetInternalDetails(item.internal_details);
        setIsFlipped(false);
    }, [item.internal_details, resetInternalDetails, setIsFlipped]);

    const handleProtectedStatusChange = useCallback(async (newStatus: StrictStatus) => {
        if (isFinalized && newStatus !== "Offen") {
            console.log(`DataItemCard ID ${item.id}: Item ist bereits '${effectiveStatus}'. Nur 'Wieder öffnen' ist erlaubt.`);
            triggerShakeLock(); // Visuelles Feedback
            return;
        }

        // Lock-Prüfung:
        // Wenn "Wieder öffnen" eines finalisierten Falls: Erlaube, wenn nicht gerade ein anderer Prozess läuft oder von anderem User gesperrt.
        // Ansonsten: Normale Lock-Prüfung.
        const blockAction = (isLocked || isProcessingFile) &&
                            !(isFinalized && newStatus === "Offen" && !isProcessingFile && (!isLocked || item.bearbeiter_id === user?.userId));

        if (blockAction) {
            if (!isFlipped) { // Nur auf Vorderseite shaken, wenn Aktion blockiert ist (und es nicht um ein erlaubtes "Wieder öffnen" geht)
                triggerShakeLock();
            }
            return;
        }
        
        if (canFlip && (newStatus === "Gelöst" || newStatus === "Abgelehnt")) {
            // Diese Bedingung wird nur erreicht, wenn isFinalized false ist (durch die Prüfung oben)
            const validatedInternalDataFromHook = validateAndPrepareSaveData();
            if (!validatedInternalDataFromHook) {
                setIsFlipped(true);
                return;
            }
            setIsProcessingFile(true);
            try {
                await onItemUpdate({ ...item, internal_details: validatedInternalDataFromHook, status: newStatus }, selectedPdfFile);
                setSelectedPdfFile(null);
                if(isFlipped) setIsFlipped(false);
            } catch (error) {
                console.error(`DataItemCard ID ${item.id}: Fehler beim Speichern/Statuswechsel zu ${newStatus}:`, error);
            } finally {
                setIsProcessingFile(false);
            }
            return;
        }
        // Für alle anderen Statusänderungen (z.B. "Offen" -> "In Bearbeitung", oder "Gelöst/Abgelehnt" -> "Offen" nach obiger Prüfung)
        onStatusChange(item.id, newStatus, currentView);
    }, [
        isLocked, isProcessingFile, isFlipped, triggerShakeLock, canFlip,
        validateAndPrepareSaveData, setIsFlipped, item, currentView, onStatusChange,
        selectedPdfFile, onItemUpdate, setSelectedPdfFile, isFinalized, effectiveStatus, user?.userId
    ]);

    const itemTypePrefix = useMemo(() => currentView === "beschwerden" ? "CMP-" : currentView === "lob" ? "LOB-" : "ANG-", [currentView]);
    const cardKey = `dataitemcard-${currentView}-${item.id}`;
    const resolvedBackgroundClass = cardAccentsEnabled && isStatusRelevantView && effectiveStatus ? getCardBackgroundAccentClasses(effectiveStatus) : getCardBackgroundAccentClasses(undefined);
    const statusToDisplayForFront = effectiveStatus || (isStatusRelevantView ? "Offen" : "N/A");

    const overallIsLockedForActions = isLocked || isAssigning || isProcessingFile;

    return (
        <motion.div key={cardKey} variants={cardContainerVariants} initial="hidden" animate="visible" exit="exit" layout
            className={`relative rounded-xl ${resolvedBackgroundClass} backdrop-blur-md shadow-xl shadow-slate-900/30 flex flex-col justify-between overflow-hidden`}
            style={{ perspective: '1000px' }}
            whileHover={!isFlipped && canFlip ? { y: -8, scale: 1.02, boxShadow: "0px 10px 25px rgba(0,0,0,0.25), 0px 6px 10px rgba(0,0,0,0.22)", transition: { type: "spring", stiffness: 200, damping: 15 } } : {}}
            whileTap={!isFlipped && canFlip ? { scale: 0.995, boxShadow: "0px 4px 12px rgba(0,0,0,0.18), 0px 2px 6px rgba(0,0,0,0.15)" } : {}} >
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
                            isLocked={overallIsLockedForActions}
                            onUploadSelectedFile={typeof onItemUpdate === 'function' ? handleUploadFile : undefined}
                            isProcessingFile={isProcessingFile}
                            onRemoveAttachment={currentView === 'beschwerden' && typeof onItemUpdate === 'function' ? handleRemoveAttachment : undefined}
                            isFinalized={isFinalized}
                            token={token} 
                        />
                        {isStatusRelevantView && effectiveStatus && (
                            <div className="px-4 md:px-5 pb-4 pt-1 border-t border-slate-700/60 mt-auto">
                                <CardActions
                                    status={effectiveStatus}
                                    isLockedByHook={isLocked}
                                    isAssigning={isAssigning}
                                    isProcessingFile={isProcessingFile}
                                    isFinalized={isFinalized}
                                    canFlip={canFlip} 
                                    onStatusChange={handleProtectedStatusChange}
                                    onToggleLock={handleToggleLock}
                                    onFlip={() => {
                                        if (canFlip) { 
                                            if (isLocked || isAssigning || isProcessingFile) { 
                                                triggerShakeLock();
                                            } else {
                                                clearValidationError();
                                                setIsFlipped(true);
                                            }
                                        }
                                    }}
                                    shakeLockAnim={shakeLockAnim}
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
                            isSubmitting={isAssigning || isProcessingFile}
                            isFinalized={isFinalized}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}