"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from '../contexts/AuthContext';
import {ViewType, AnyItemStatus, CardSpecificDataItem, BeschwerdeItem } from '../types'; // BeschwerdeItem ist wichtig
import { API_ENDPOINTS, VIEW_TITLES } from '../constants';
import StatusBar from './StatusBar';
import ViewTabs from './ViewTabs';
import FilterControls from './FilterControls';
import DataItemCard from './DataItemCard/DataItemCard';
import StatisticsView from './StatisticsView';
import AdminSection from './AdminSection';
import { useAppFilters } from '../hooks/useAppFilters';
import { useDataFetching } from '../hooks/useDataFetching';

export type DateFilterTarget = 'erstelltam' | 'datum';

export default function ContaintTable() {
    const { isAuthenticated, user, token, isLoadingAuth, logout } = useAuth();

    const [currentView, setCurrentView] = useState<ViewType>("beschwerden");
    const [copiedCellKey, setCopiedCellKey] = useState<string | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
    const [cardAccentsEnabled, setCardAccentsEnabled] = useState<boolean>(true);

    const {
        data,
        isLoadingData,
        error: dataFetchingError,
        isDbConnected,
        lastDataUpdateTimestamp,
        refetchData,
        updateSingleItemInCache,
    } = useDataFetching({ currentView, token, isAuthenticated, logout });

    const {
        filteredData,
        activeStatusFilter, setActiveStatusFilter,
        searchTerm, setSearchTerm,
        emailSearchTerm, setEmailSearchTerm,
        idSearchTerm, setIdSearchTerm,
        assigneeSearchTerm, setAssigneeSearchTerm,
        haltestelleSearchTerm, setHaltestelleSearchTerm,
        linieSearchTerm, setLinieSearchTerm,
        startDateInput, setStartDateInput,
        endDateInput, setEndDateInput,
        dateFilterTarget, setDateFilterTarget,
        handleApplyDateFilter,
        handleClearDateFilter,
        isDateFilterApplied,
    } = useAppFilters({ initialData: data, currentView });

    const [uiError, setUiError] = useState<string | null>(null);

    useEffect(() => {
        if (currentView !== "statistik" && currentView !== "admin") {
            setShowAdvancedFilters(false);
        }
        setUiError(null);
    }, [currentView]);

    const handleItemUpdate = useCallback(async (
        itemToUpdate: CardSpecificDataItem, 
        file?: File | null 
    ): Promise<void> => {
        if (!token) {
            setUiError("Nicht autorisiert.");
            logout();
            throw new Error("Nicht autorisiert.");
        }

        setUiError(null); 

        const viewSpecificApiBase = API_ENDPOINTS[currentView as keyof typeof API_ENDPOINTS];
        if (!viewSpecificApiBase) {
            const errorMsg = `Kein API Endpunkt für View '${currentView}' definiert.`;
            setUiError(errorMsg);
            throw new Error(errorMsg);
        }

        try {
            let response: Response;
            let updatedItemFromServer: CardSpecificDataItem;

            if (file && currentView === 'beschwerden') {
                const formData = new FormData();
                formData.append('attachment', file, file.name); 
                
                const uploadUrl = `${viewSpecificApiBase}/${itemToUpdate.id}/attachment`;
                console.log(`ContaintTable: Starte Datei-Upload für Item ${itemToUpdate.id} zu ${uploadUrl}`);

                response = await fetch(uploadUrl, {
                    method: 'POST', 
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    if (response.status === 401) { logout(); setUiError("Sitzung abgelaufen."); throw new Error("Sitzung abgelaufen."); }
                    throw new Error(errorData.message || errorData.details || errorData.error || `Fehler beim Hochladen der Datei (${response.status})`);
                }
                updatedItemFromServer = await response.json();
                console.log("ContaintTable: Datei erfolgreich hochgeladen, Server-Antwort:", updatedItemFromServer);

            } else if (itemToUpdate.internal_details && currentView === 'beschwerden' && !file) {
                const payload = {
                    id: itemToUpdate.id,
                    internal_details: itemToUpdate.internal_details
                };
                console.log(`ContaintTable: Aktualisiere internal_details für Item ${itemToUpdate.id}`);
                response = await fetch(viewSpecificApiBase, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    if (response.status === 401) { logout(); setUiError("Sitzung abgelaufen."); throw new Error("Sitzung abgelaufen."); }
                    throw new Error(errorData.details || errorData.error || `Fehler beim Speichern der Details (${response.status})`);
                }
                updatedItemFromServer = await response.json();
                console.log("ContaintTable: Internal details erfolgreich gespeichert, Server-Antwort:", updatedItemFromServer);

            // KORRIGIERTE ZEILE HIER:
            } else if (!file && (itemToUpdate as BeschwerdeItem).attachment_filename === null && currentView === 'beschwerden') {
                console.log(`ContaintTable: Anhang für Item ${itemToUpdate.id} wurde entfernt, aktualisiere Cache.`);
                updatedItemFromServer = itemToUpdate; 
            
            } else {
                console.warn("ContaintTable: handleItemUpdate aufgerufen ohne Datei oder internal_details für Beschwerden, oder für eine andere View. Aktion wird nicht ausgeführt.", itemToUpdate);
                return; 
            }

            if (updatedItemFromServer) {
                updateSingleItemInCache(updatedItemFromServer);
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler beim Aktualisieren.";
            setUiError(errorMessage);
            throw err; 
        }
    }, [token, logout, currentView, updateSingleItemInCache, setUiError]);
    
    const handleCopyToClipboard = useCallback(async (textToCopy: string, cellKey: string) => {
        if (!textToCopy) return;
        if (!navigator.clipboard) { setUiError("Kopieren nicht möglich: Clipboard API nicht unterstützt oder nicht sicher (HTTPS benötigt)."); setTimeout(() => setUiError(null), 3000); return; }
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopiedCellKey(cellKey);
            setTimeout(() => setCopiedCellKey(null), 1500);
        } catch (err) { console.error("Fehler beim Kopieren:", err); setUiError("Kopieren fehlgeschlagen."); setTimeout(() => setUiError(null), 3000); setCopiedCellKey(null); }
    }, [setUiError, setCopiedCellKey]);

    const performStatusChangeAsync = useCallback(async (itemId: number, newStatus: AnyItemStatus, viewForApi: ViewType) => {
        if (!token || !user) { setUiError("Nicht autorisiert."); if (!token) logout(); return; }
        const originalItem = data.find(item => item.id === itemId);
        if (!originalItem) { console.error("Original-Item nicht gefunden:", itemId); refetchData(currentView, true); return; }
        const optimisticItemUpdate: Partial<CardSpecificDataItem> = { status: newStatus };
        if (newStatus === "In Bearbeitung") { optimisticItemUpdate.bearbeiter_id = user.userId; optimisticItemUpdate.bearbeiter_name = user.username; optimisticItemUpdate.action_required = undefined; }
        else if (newStatus === "Offen") { optimisticItemUpdate.bearbeiter_id = null; optimisticItemUpdate.bearbeiter_name = null; optimisticItemUpdate.abgeschlossenam = null; optimisticItemUpdate.action_required = "relock_ui"; }
        const optimisticItem = { ...originalItem, ...optimisticItemUpdate } as CardSpecificDataItem;
        updateSingleItemInCache(optimisticItem);
        setUiError(null);
        const apiEndpointKey = viewForApi as keyof typeof API_ENDPOINTS;
        const apiEndpoint = API_ENDPOINTS[apiEndpointKey];
        if (!apiEndpoint) { setUiError(`API Endpunkt für ${VIEW_TITLES[viewForApi]} nicht definiert.`); updateSingleItemInCache(originalItem as CardSpecificDataItem); return; }
        try {
            const response = await fetch(apiEndpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ id: itemId, status: newStatus }), });
            if (!response.ok) { updateSingleItemInCache(originalItem as CardSpecificDataItem); const errorData = await response.json().catch(() => ({})); if (response.status === 401) { logout(); setUiError("Sitzung abgelaufen."); return; } throw new Error(errorData.details || errorData.error || `Statusupdate fehlgeschlagen (${response.status})`); }
            const updatedItemFromServer: CardSpecificDataItem = await response.json();
            updateSingleItemInCache(updatedItemFromServer);
        } catch (err) { updateSingleItemInCache(originalItem as CardSpecificDataItem); setUiError(err instanceof Error ? err.message : `Statusupdate für ${VIEW_TITLES[viewForApi]} fehlgeschlagen.`); }
    }, [token, user, logout, data, currentView, refetchData, updateSingleItemInCache, setUiError]);

    const handleStatusChangeForCard = (itemId: number, newStatus: AnyItemStatus, itemTypeView: ViewType): void => {
        if (itemTypeView === "beschwerden" || itemTypeView === "lob" || itemTypeView === "anregungen") {
            performStatusChangeAsync(itemId, newStatus as AnyItemStatus, itemTypeView).catch(err => console.error(`ContaintTable: Fehler bei performStatusChangeAsync für ${itemTypeView}:`, err));
        } else { setUiError("Statusänderung in dieser Ansicht nicht möglich."); setTimeout(() => setUiError(null), 3000); }
    };

    if (isLoadingAuth) { return <div className="text-center py-10">Authentifizierung wird geladen...</div>; }
    if (!isAuthenticated && !isLoadingAuth) { return <div className="text-center py-10">Bitte einloggen.</div>; }

    const displayError = dataFetchingError || uiError;

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#0D0D12] via-[#111318] to-[#0a0a0f] text-white font-sans relative pt-16 pb-16 overflow-hidden">
            <StatusBar isDbConnected={isDbConnected} lastDataUpdateTimestamp={lastDataUpdateTimestamp} />
            <motion.div className="w-full max-w-none p-4 md:p-8 mx-auto relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <ViewTabs currentView={currentView} setCurrentView={setCurrentView} user={user} />
                <div className="flex flex-col md:flex-row justify-between items-center my-4">
                    <h1 className="text-xl md:text-4xl font-semibold text-neutral-200 text-center md:text-left mb-2 md:mb-0">{VIEW_TITLES[currentView] || "Übersicht"}</h1>
                </div>

                {currentView !== "statistik" && currentView !== "admin" && (
                    <FilterControls
                        currentView={currentView} activeStatusFilter={activeStatusFilter} setActiveStatusFilter={setActiveStatusFilter}
                        searchTerm={searchTerm} setSearchTerm={setSearchTerm} emailSearchTerm={emailSearchTerm} setEmailSearchTerm={setEmailSearchTerm}
                        idSearchTerm={idSearchTerm} setIdSearchTerm={setIdSearchTerm} assigneeSearchTerm={assigneeSearchTerm} setAssigneeSearchTerm={setAssigneeSearchTerm}
                        haltestelleSearchTerm={haltestelleSearchTerm} setHaltestelleSearchTerm={setHaltestelleSearchTerm} linieSearchTerm={linieSearchTerm} setLinieSearchTerm={setLinieSearchTerm}
                        showAdvancedFilters={showAdvancedFilters} setShowAdvancedFilters={setShowAdvancedFilters} startDateInput={startDateInput} setStartDateInput={setStartDateInput}
                        endDateInput={endDateInput} setEndDateInput={setEndDateInput} handleApplyDateFilter={handleApplyDateFilter} handleClearDateFilter={handleClearDateFilter}
                        isDateFilterApplied={isDateFilterApplied} cardAccentsEnabled={cardAccentsEnabled} setCardAccentsEnabled={setCardAccentsEnabled}
                        dateFilterTarget={dateFilterTarget} setDateFilterTarget={setDateFilterTarget} />
                )}

                {displayError && currentView !== "statistik" && currentView !== "admin" && (
                    <div className="my-4 p-3 bg-red-700/80 text-red-100 border border-red-600 rounded-md shadow-lg" role="alert">
                        <p><strong>Fehler:</strong> {displayError}</p>
                    </div>
                )}

                {currentView === "admin" ? (<AdminSection />) :
                    currentView === "statistik" ? (<StatisticsView />) :
                        isLoadingData && !dataFetchingError ? (<div className="text-center py-10 text-neutral-400">Lade Daten...</div>) :
                            !isLoadingData && filteredData.length === 0 && !dataFetchingError ? (
                                <div className="text-center py-10 text-neutral-500">Keine Einträge für die aktuellen Filter gefunden.</div>
                            ) : !isLoadingData && filteredData.length > 0 && !dataFetchingError ? (
                                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                                    {filteredData.map((item) => (
                                        <DataItemCard
                                            key={`${currentView}-${item.id}-${item.erstelltam}`}
                                            item={item as CardSpecificDataItem}
                                            currentView={currentView}
                                            copiedCellKey={copiedCellKey} onCopyToClipboard={handleCopyToClipboard}
                                            onStatusChange={(itemId, newStatus) => handleStatusChangeForCard(itemId, newStatus as AnyItemStatus, currentView)}
                                            cardAccentsEnabled={cardAccentsEnabled}
                                            onItemUpdate={handleItemUpdate} 
                                        />
                                    ))}
                                </motion.div>
                            ) : null
                }
            </motion.div>
        </div>
    );
}