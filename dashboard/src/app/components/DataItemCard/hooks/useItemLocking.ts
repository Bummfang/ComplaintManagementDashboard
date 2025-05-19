// app/components/DataItemCard/hooks/useItemLocking.ts
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext'; // Pfad an deine Struktur anpassen
import { API_ENDPOINTS } from '@/app/constants'; // Pfad an deine Struktur anpassen
import { ViewType, CardSpecificDataItem } from '@/app/types'; // Pfad an deine Struktur anpassen

interface UseItemLockingProps {
    item: CardSpecificDataItem; // Das gesamte Item-Objekt für Bearbeiter-ID und Status
    initialLockedState?: boolean;
    onItemUpdate: (updatedItem: CardSpecificDataItem) => void;
    currentView: ViewType; // Wird für den API-Endpunkt benötigt
}

export function useItemLocking({
    item,
    initialLockedState = true,
    onItemUpdate,
    currentView,
}: UseItemLockingProps) {
    const { user, token } = useAuth();
    const [isLocked, setIsLocked] = useState(initialLockedState);
    const [shakeLockAnim, setShakeLockAnim] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false); // Zustand für laufende Zuweisung

    // Effekt, um den Lock-Status zurückzusetzen, wenn sich das Item oder der User ändert
    // oder wenn eine `relock_ui` Action vom Server kommt.
    useEffect(() => {
        // Wenn das Item einen `action_required: "relock_ui"` hat, sperren.
        // Dies ist nützlich, wenn ein anderer User das Item freigegeben hat oder es wieder geöffnet wurde.
        if (item.action_required === "relock_ui" && item.status === "Offen" && item.bearbeiter_id === null) {
            setIsLocked(true);
        } else {
            // Ansonsten den initialen Lock-Status beibehalten oder basierend auf Bearbeiter setzen
            // Wenn ein Bearbeiter gesetzt ist und es nicht der aktuelle User ist, sollte es gesperrt sein.
            // Wenn kein Bearbeiter gesetzt ist, initial gesperrt.
            // Wenn der aktuelle User der Bearbeiter ist, initial entsperrt.
            if (item.bearbeiter_id && user && item.bearbeiter_id === user.userId) {
                setIsLocked(false);
            } else {
                 setIsLocked(initialLockedState);
            }
        }
    }, [item.id, item.bearbeiter_id, item.status, item.action_required, user?.userId, initialLockedState]);


    const triggerShakeLock = useCallback(() => {
        setShakeLockAnim(true);
        setTimeout(() => setShakeLockAnim(false), 400); // Dauer der Animation
    }, []);

    const handleToggleLock = useCallback(async () => {
        if (isAssigning) return; // Verhindere mehrfache Ausführung

        const wasLocked = isLocked;
        const newLockState = !wasLocked;
        // Optimistisches Update des UI-Lock-Status
        setIsLocked(newLockState);

        if (shakeLockAnim) {
            setShakeLockAnim(false);
        }

        // Nur API-Call ausführen, wenn von "gesperrt" zu "entsperrt" gewechselt wird
        // UND noch kein Bearbeiter zugewiesen ist UND der aktuelle Benutzer gültig ist.
        const isStatusRelevantView = currentView === 'beschwerden' || currentView === 'lob' || currentView === 'anregungen';

        if (wasLocked && !newLockState && item.bearbeiter_id === null && user?.userId && token && isStatusRelevantView) {
            setIsAssigning(true);
            try {
                console.log(`DataItemCard ID ${item.id} (Hook): Attempting to assign user ${user.username} (ID: ${user.userId}).`);
                const apiEndpointKey = currentView as keyof typeof API_ENDPOINTS;
                const apiEndpoint = API_ENDPOINTS[apiEndpointKey];

                if (!apiEndpoint) {
                    console.error("DataItemCard ID (Hook): No API endpoint for assignment for view:", currentView);
                    throw new Error("API endpoint not configured for this view.");
                }

                const response = await fetch(apiEndpoint, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        id: item.id,
                        assign_me_as_bearbeiter: true // Spezifisches Flag für die API
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: "Server error during assignment" }));
                    console.error(`DataItemCard ID ${item.id} (Hook): Error assigning user - Status ${response.status}`, errorData);
                    setIsLocked(true); // Lock zurücksetzen bei Fehler
                    triggerShakeLock();
                    setIsAssigning(false);
                    // Optional: Fehlermeldung an Parent weitergeben oder hier anzeigen
                    return;
                }
                
                const updatedItemFromServer: CardSpecificDataItem = await response.json();
                console.log(`DataItemCard ID ${item.id} (Hook): User successfully assigned. Response:`, updatedItemFromServer);
                onItemUpdate(updatedItemFromServer); // Parent-Komponente über das geänderte Item informieren
                // setIsLocked(false) wurde schon optimistisch gesetzt

            } catch (err) {
                console.error(`DataItemCard ID ${item.id} (Hook): Critical error during user assignment:`, err);
                setIsLocked(true); // Lock zurücksetzen bei schwerem Fehler
                triggerShakeLock();
                // Optional: Fehlermeldung
            } finally {
                setIsAssigning(false);
            }
        } else if (!wasLocked && newLockState) {
            // Von "entsperrt" zu "gesperrt"
            // Hier könnte optional ein API-Call erfolgen, um die Bearbeitung explizit freizugeben,
            // aber typischerweise wird dies durch Statusänderungen gehandhabt (z.B. "Wieder öffnen").
            // Fürs Erste keine API-Aktion hier.
            console.log(`DataItemCard ID ${item.id} (Hook): Item locked by user.`);
        } else if (wasLocked && !newLockState && item.bearbeiter_id !== null && item.bearbeiter_id !== user?.userId) {
            // Versuch, ein von einem anderen User gesperrtes Item zu entsperren -> Shake
            setIsLocked(true); // Zurücksetzen, da nicht erlaubt
            triggerShakeLock();
            console.warn(`DataItemCard ID ${item.id} (Hook): Attempt to unlock item assigned to another user.`);
        }

    }, [isLocked, item, user, token, currentView, onItemUpdate, triggerShakeLock, shakeLockAnim, isAssigning]);

    return {
        isLocked,
        setIsLocked, // Erlaube externes Setzen, falls nötig (z.B. durch `action_required`)
        shakeLockAnim,
        handleToggleLock,
        triggerShakeLock,
        isAssigning, // Um UI-Feedback während des API-Calls zu geben
    };
}
