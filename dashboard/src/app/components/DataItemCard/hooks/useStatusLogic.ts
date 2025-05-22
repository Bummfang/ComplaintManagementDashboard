// app/components/DataItemCard/hooks/useStatusLogic.ts
"use client";

import { useMemo } from 'react';
import { CardSpecificDataItem, ViewType, AnyItemStatus as StrictStatus } from '@/app/types'; 
import { formatDateTime } from '@/app/utils'; 

// Hilfstyp für die Parameter der Utility-Funktionen, um null/undefined explizit zu erlauben,
// da effectiveStatus auch undefined sein kann.
type UtilityStatusParam = StrictStatus | null | undefined;






/**
 * Utility function to get the text color class based on item status.
 * @param status The status of the item.
 * @returns Tailwind CSS class string for text color.
 */
export const getStatusTextColorClass = (status?: UtilityStatusParam): string => {
    switch (status) {
        case "Offen": return "text-sky-400 font-medium";
        case "In Bearbeitung": return "text-amber-400 font-medium";
        case "Gelöst": return "text-green-400 font-medium";
        case "Abgelehnt": return "text-red-400 font-medium";
        default: return "text-slate-200"; // Default for null, undefined, or unknown status
    }
};






/**
 * Utility function to get background accent classes for the card based on item status.
 * @param status The status of the item.
 * @returns Tailwind CSS class string for background.
 */
export const getCardBackgroundAccentClasses = (status?: UtilityStatusParam): string => {
    const baseFallback = "bg-slate-800/60"; // Default background
    switch (status) {
        case "Offen": return "bg-sky-900/[.4]";
        case "In Bearbeitung": return "bg-amber-900/[.3]";
        case "Gelöst": return "bg-green-900/[.4]";
        case "Abgelehnt": return "bg-red-900/[.3]";
        default: return baseFallback;
    }
};






interface UseStatusLogicProps {
    item: CardSpecificDataItem;
    currentView: ViewType;
}






// Stelle sicher, dass diese Funktion korrekt exportiert wird.
export function useStatusLogic({ item, currentView }: UseStatusLogicProps) {
    const isStatusRelevantView = useMemo(() => {
        return currentView === 'beschwerden' || currentView === 'lob' || currentView === 'anregungen';
    }, [currentView]);

    // effectiveStatus kann einer der definierten Status (StrictStatus) sein oder undefined.
    const effectiveStatus: StrictStatus | undefined = useMemo(() => {
        if (!isStatusRelevantView) {
            return undefined; 
        }

        // item.status ist laut deiner Typdefinition (z.B. status?: AllowedBeschwerdeStatus)
        // vom Typ StrictStatus | undefined.
        const currentItemStatus = item.status; 

        if (currentItemStatus && ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"].includes(currentItemStatus as string)) {
            // Hier wissen wir, dass currentItemStatus ein gültiger String aus StrictStatus ist.
            return currentItemStatus as StrictStatus;
        }
        
        // Fallback für relevante Views, wenn Status nicht gesetzt/gültig
        return "Offen"; 
    }, [item.status, isStatusRelevantView]);

    const statusTextColorClass = useMemo(() => {
        return getStatusTextColorClass(effectiveStatus);
    }, [effectiveStatus]);

    const cardBackgroundAccentClass = useMemo(() => {
        // effectiveStatus ist hier entweder StrictStatus oder undefined.
        // Wenn isStatusRelevantView true ist, ist effectiveStatus immer ein StrictStatus (z.B. "Offen").
        return isStatusRelevantView && effectiveStatus
            ? getCardBackgroundAccentClasses(effectiveStatus)
            : getCardBackgroundAccentClasses(undefined); // Fallback für nicht-relevante Views
    }, [effectiveStatus, isStatusRelevantView]);

    const { abgeschlossenText, abgeschlossenValueClassName } = useMemo(() => {
        let text: string | null = null;
        let className = "text-slate-500 italic"; 

        if (isStatusRelevantView) {
            // Wenn isStatusRelevantView true ist, ist effectiveStatus hier immer ein StrictStatus string.
            if (item.abgeschlossenam) {
                text = formatDateTime(item.abgeschlossenam);
                className = "text-green-400";
            } else if (effectiveStatus === "Offen") {
                text = "Ausstehend";
                className = "text-slate-500 italic";
            } else if (effectiveStatus === "In Bearbeitung") {
                text = "In Bearbeitung";
                className = "text-amber-400 italic";
            } else if (effectiveStatus === "Gelöst" || effectiveStatus === "Abgelehnt") {
                text = `Abgeschlossen (Datum n.a.)`;
                className = getStatusTextColorClass(effectiveStatus); // effectiveStatus ist hier sicher ein gültiger String
            }
        }
        return { abgeschlossenText: text, abgeschlossenValueClassName: className };
    }, [item.abgeschlossenam, effectiveStatus, isStatusRelevantView]);

    return {
        isStatusRelevantView,
        effectiveStatus, // Typ ist StrictStatus | undefined
        statusTextColorClass,
        cardBackgroundAccentClass,
        abgeschlossenText,
        abgeschlossenValueClassName,
    };
}
