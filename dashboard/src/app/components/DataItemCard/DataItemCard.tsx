// app/components/DataItemCard/DataItemCard.tsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CardSpecificDataItem,
    ViewType,
    AnyItemStatus as StrictStatus
} from '@/app/types'; 
import { useAuth } from '@/app/contexts/AuthContext'; 

import CardFront from './CardFront';
import CardBack from './CardBack';
import CardActions from './CardActions'; // Wird zu CardActions_v2 (oder wie auch immer du die neue Datei nennst)
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
    onItemUpdate: (updatedItem: CardSpecificDataItem) => void;
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
    const { user } = useAuth();
    const [isFlipped, setIsFlipped] = useState(false);

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
        onItemUpdate,
        currentView,
    });

    const canFlip = useMemo(() => currentView === 'beschwerden', [currentView]);

    // NEU: Prüfen, ob die Klärungsart in den *gespeicherten* Details fehlt
    const isClarificationMissingInSavedDetails = useMemo(() => {
        if (canFlip) { // Nur relevant, wenn die Karte interne Details haben kann
            return !item.internal_details?.clarificationType;
        }
        return false; // Für Karten ohne interne Details ist nichts "fehlend"
    }, [item.internal_details, canFlip]);


    useEffect(() => {
        if (isFlipped) {
             clearValidationError();
        }
    }, [item.id, item.internal_details, isFlipped, clearValidationError]);

    useEffect(() => {
        if (
            isStatusRelevantView &&
            (item.status === "Offen" || item.status === undefined) && 
            item.bearbeiter_id === null &&
            item.action_required === "relock_ui" &&
            isLocked === false 
        ) {
            console.log(`DataItemCard ID ${item.id}: action_required relock_ui received. Locking card.`);
            setIsLocked(true);
        }
    }, [item.status, item.bearbeiter_id, item.action_required, isStatusRelevantView, setIsLocked, isLocked, item.id]);


    const handleSaveInternal = useCallback(() => {
        const validData = validateAndPrepareSaveData();
        if (validData) {
            const updatedItemWithInternalDetails: CardSpecificDataItem = {
                ...item,
                internal_details: validData,
            };
            onItemUpdate(updatedItemWithInternalDetails);
            setIsFlipped(false);
        }
    }, [item, onItemUpdate, validateAndPrepareSaveData]);

    const handleCancelInternal = useCallback(() => {
        resetInternalDetails(item.internal_details);
        setIsFlipped(false);
    }, [item.internal_details, resetInternalDetails]);

    const handleProtectedStatusChange = useCallback((newStatus: StrictStatus) => {
        if (isLocked && !isFlipped) {
            triggerShakeLock();
            return; 
        }

        // Die primäre Prüfung, ob die Klärungsart *gespeichert* ist, erfolgt jetzt über
        // die `disabled`-Logik in CardActions.
        // Diese Validierung hier prüft die *aktuellen Formulardaten* auf der Rückseite.
        // Das ist immer noch sinnvoll, falls der User die Seite editiert hat, aber noch nicht gespeichert.
        if (canFlip && (newStatus === "Gelöst" || newStatus === "Abgelehnt")) {
            const validatedInternalDataFromHook = validateAndPrepareSaveData();
            if (!validatedInternalDataFromHook) { 
                setIsFlipped(true); 
                console.warn(`DataItemCard ID ${item.id}: Status change to ${newStatus} prevented. Current internal details form is invalid.`);
                return; 
            }
        }

        onStatusChange(item.id, newStatus, currentView);

    }, [
        isLocked,
        isFlipped,
        triggerShakeLock,
        onStatusChange,
        item.id,
        currentView,
        canFlip, 
        validateAndPrepareSaveData, 
        setIsFlipped,
    ]);


    const itemTypePrefix = useMemo(() => {
        return currentView === "beschwerden" ? "CMP-" : currentView === "lob" ? "LOB-" : "ANG-";
    }, [currentView]);

    const cardKey = `dataitemcard-${currentView}-${item.id}`;

    const resolvedBackgroundClass = cardAccentsEnabled && isStatusRelevantView && effectiveStatus
        ? getCardBackgroundAccentClasses(effectiveStatus)
        : getCardBackgroundAccentClasses(undefined);

    const statusToDisplayForFront = effectiveStatus || (isStatusRelevantView ? "Offen" : "N/A");

    return (
        <motion.div
            key={cardKey}
            variants={cardContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
            className={`relative rounded-xl ${resolvedBackgroundClass} backdrop-blur-md shadow-xl shadow-slate-900/30 flex flex-col justify-between overflow-hidden`}
            style={{ perspective: '1000px' }}
            whileHover={!isFlipped || !canFlip ? { y: -8, scale: 1.02, boxShadow: "0px 10px 25px rgba(0,0,0,0.25), 0px 6px 10px rgba(0,0,0,0.22)", transition: { type: "spring", stiffness: 200, damping: 15 } } : {}}
            whileTap={!isFlipped || !canFlip ? { scale: 0.995, boxShadow: "0px 4px 12px rgba(0,0,0,0.18), 0px 2px 6px rgba(0,0,0,0.15)" } : {}}
        >
            <AnimatePresence mode="wait" initial={false}>
                {(!isFlipped || !canFlip) ? (
                    <motion.div
                        key={`${cardKey}-frontface`}
                        variants={flipContentVariantsFront}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="flex flex-col flex-grow"
                    >
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
                        />
                        {isStatusRelevantView && effectiveStatus && (
                             <div className="px-4 md:px-5 pb-4 pt-1 border-t border-slate-700/60 mt-auto">
                                <CardActions
                                    status={effectiveStatus}
                                    isLocked={isLocked}
                                    canFlip={canFlip}
                                    onStatusChange={handleProtectedStatusChange}
                                    onToggleLock={handleToggleLock}
                                    onFlip={() => {
                                        clearValidationError(); 
                                        setIsFlipped(true);
                                    }}
                                    shakeLockAnim={shakeLockAnim}
                                    isAssigning={isAssigning}
                                    isClarificationMissingInSavedDetails={isClarificationMissingInSavedDetails} // Prop übergeben
                                />
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key={`${cardKey}-backface`}
                        variants={flipContentVariantsBack}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="flex flex-col flex-grow h-full"
                    >
                        <CardBack
                            internalDetails={internalDetails} // Die aktuellen Formulardaten
                            onDetailChange={handleInternalDetailChange}
                            onSave={handleSaveInternal}
                            onCancel={handleCancelInternal}
                            validationError={validationError}
                            cardKey={cardKey}
                            isSubmitting={isAssigning} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
