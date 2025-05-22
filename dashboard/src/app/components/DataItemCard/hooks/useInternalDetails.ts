// app/components/DataItemCard/hooks/useInternalDetails.ts
"use client";
import { useState, useCallback, useEffect } from 'react';
import { InternalCardData, defaultInternalDetails } from '../../../types'; // Pfad an deine Struktur angepasst







export function useInternalDetails(initialData?: InternalCardData) {
    // State for the internal details form
    const [internalDetails, setInternalDetails] = useState<InternalCardData>(
        initialData ? { ...defaultInternalDetails, ...initialData } : { ...defaultInternalDetails }
    );


    
    // State for validation errors on the internal details form
    const [validationError, setValidationError] = useState<string | null>(null);

    /**
     * Updates the internal details state when the initialData prop changes.
     * This is useful if the parent component updates the item and its internal_details.
     */
    useEffect(() => {
        setInternalDetails(initialData ? { ...defaultInternalDetails, ...initialData } : { ...defaultInternalDetails });
        // Reset validation error when initial data changes, e.g., when flipping the card or item updates
        setValidationError(null);
    }, [initialData]);

    /**
     * Handles changes to any field in the internal details form.
     * @param key The key of the InternalCardData field to update.
     * @param value The new value for the field.
     */
    const handleInternalDetailChange = useCallback(<K extends keyof InternalCardData>(
        key: K,
        value: InternalCardData[K]
    ) => {
        setInternalDetails(prev => {
            const newState = { ...prev, [key]: value };
            // Specific logic: If 'moneyRefunded' is unchecked, reset 'refundAmount'.
            if (key === 'moneyRefunded' && !value) {
                newState.refundAmount = "";
            }
            return newState;
        });
        // Clear any existing validation error when the user makes a change.
        setValidationError(null);
    }, []);

    /**
     * Validates the current internal details.
     * Sets a validation error message if validation fails.
     * @returns The validated InternalCardData if valid, otherwise null.
     */
    const validateAndPrepareSaveData = useCallback((): InternalCardData | null => {
        // Rule 1: Clarification type must be selected.
        if (!internalDetails.clarificationType) {
            setValidationError("Bitte wählen Sie eine Klärungsart (schriftlich oder telefonisch).");
            return null;
        }
        // Rule 2: If money was refunded, a valid refund amount (greater than 0) must be entered.
        if (internalDetails.moneyRefunded && (!internalDetails.refundAmount || parseFloat(internalDetails.refundAmount) <= 0)) {
            setValidationError("Wenn 'Geld erstattet' gewählt ist, muss ein gültiger Betrag (größer als 0) eingetragen werden.");
            return null;
        }
        // All validations passed.
        setValidationError(null);
        return internalDetails;
    }, [internalDetails]);

    /**
     * Resets the internal details form to the provided data or to default values.
     * Also clears any validation errors.
     * @param resetToData Optional data to reset the form to. Defaults to defaultInternalDetails.
     */
    const resetInternalDetails = useCallback((resetToData?: InternalCardData) => {
        setInternalDetails(resetToData ? { ...defaultInternalDetails, ...resetToData } : { ...defaultInternalDetails });
        setValidationError(null);
    }, []);

    /**
     * Clears the current validation error message.
     */
    const clearValidationError = useCallback(() => {
        setValidationError(null);
    }, []);

    return {
        internalDetails,
        setInternalDetails, // Exposing setInternalDetails directly for flexibility if needed
        validationError,
        handleInternalDetailChange,
        validateAndPrepareSaveData,
        resetInternalDetails,
        clearValidationError
    };
}
