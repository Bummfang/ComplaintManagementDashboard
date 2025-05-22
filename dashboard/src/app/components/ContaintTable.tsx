// app/components/ContaintTable.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from '../contexts/AuthContext';
import { ViewType, AnyItemStatus, CardSpecificDataItem, BeschwerdeItem, InternalCardData } from '../types';
import { API_ENDPOINTS, VIEW_TITLES } from '../constants';
import StatusBar from './StatusBar';
import ViewTabs from './ViewTabs';
import FilterControls from './FilterControls';
import DataItemCard from './DataItemCard/DataItemCard';
import StatisticsView from './StatisticsView';
import AdminSection from './AdminSection';
import { useAppFilters } from '../hooks/useAppFilters';
import { useDataFetching } from '../hooks/useDataFetching';
import PaginationControls from "./PaginationControls"; // Importiere deine Paginierungskomponente

export type DateFilterTarget = 'erstelltam' | 'datum';

interface PatchPayload {
    id: number | string;
    status?: AnyItemStatus;
    internal_details?: InternalCardData;
    attachment_filename?: null;
}

export default function ContaintTable() {
    const { isAuthenticated, user, token, isLoadingAuth, logout } = useAuth();

    const [currentView, setCurrentView] = useState<ViewType>("beschwerden");
    const [copiedCellKey, setCopiedCellKey] = useState<string | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
    const [cardAccentsEnabled, setCardAccentsEnabled] = useState<boolean>(true);
    const previousDataCountRef = useRef<number>(0);
    const [uiError, setUiError] = useState<string | null>(null);

    // NEU: State für Paginierung
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(20); // Standardanzahl, synchron mit Backend

    // useAppFilters verwaltet die Zustände der Filter-Eingabefelder
    const {
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
        handleApplyDateFilter: applyDateFilterFromHook,
        handleClearDateFilter: clearDateFilterFromHook,
        isDateFilterApplied,
    } = useAppFilters({
        initialData: [], // Wird nicht mehr für clientseitige Filterung der Hauptdaten verwendet
        currentView
    });

    // Filterobjekt für useDataFetching erstellen
    const currentFilters = useMemo(() => {
        const filters: Record<string, any> = {
            status: activeStatusFilter === 'alle' ? undefined : activeStatusFilter,
            searchTerm: searchTerm || undefined,
            emailSearchTerm: emailSearchTerm || undefined,
            idSearchTerm: idSearchTerm || undefined,
            assigneeSearchTerm: assigneeSearchTerm || undefined,
            dateFilterTarget: dateFilterTarget || undefined, // Backend sollte Default haben oder 'erstelltam'
        };
        if (isDateFilterApplied) {
            filters.startDate = startDateInput || undefined;
            filters.endDate = endDateInput || undefined;
        }
        if (currentView === 'beschwerden') {
            filters.haltestelleSearchTerm = haltestelleSearchTerm || undefined;
            filters.linieSearchTerm = linieSearchTerm || undefined;
        }
        // Entferne undefined/null Werte, um die URL sauber zu halten
        Object.keys(filters).forEach(key => (filters[key] === undefined || filters[key] === null || String(filters[key]).trim() === '') && delete filters[key]);
        return filters;
    }, [
        activeStatusFilter, searchTerm, emailSearchTerm, idSearchTerm, assigneeSearchTerm,
        haltestelleSearchTerm, linieSearchTerm, currentView,
        startDateInput, endDateInput, dateFilterTarget, isDateFilterApplied
    ]);

    // useDataFetching mit Paginierungs- und Filterparametern aufrufen
    const {
        items, // Umbenannt von 'data' zu 'items'
        totalItems,
        totalPages,
        // currentPage als currentPageFromHook, wenn du den serverseitigen Wert direkt nutzen willst
        // limit als limitFromHook
        isLoadingData,
        error: dataFetchingError,
        isDbConnected,
        lastDataUpdateTimestamp,
        refetchData,
        updateSingleItemInCache,
    } = useDataFetching({
        currentView,
        token,
        isAuthenticated,
        logout,
        currentPage, // aus dem lokalen State
        itemsPerPage, // aus dem lokalen State
        filters: currentFilters,
    });

    // Wenn sich Filter ändern (außer Seite), auf Seite 1 zurückspringen
    useEffect(() => {
        // Dieser Effekt soll nicht beim allerersten Rendern oder bei Seitenwechsel die Seite auf 1 setzen,
        // sondern nur, wenn sich die Filter tatsächlich ändern.
        const isMounted = previousDataCountRef.current !== 0; // Einfache Prüfung, ob es nicht der erste Render ist
        if (isMounted && currentPage !== 1) {
             // console.log("[ContaintTable] Filter changed, resetting to page 1. Current Filters:", JSON.stringify(currentFilters));
            setCurrentPage(1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(currentFilters)]); // JSON.stringify für tiefen Vergleich des Filterobjekts


    // Effekt für den Benachrichtigungston
    useEffect(() => {
        if (!isLoadingData && items) { // `items` statt `data` verwenden
            if (currentView === "beschwerden") {
                // Ton nur bei neuen Items auf Seite 1 und keinen aktiven Filtern (oder spezifischer Logik)
                const noFiltersApplied = Object.keys(currentFilters).length === 0 || 
                                       (Object.keys(currentFilters).length === 1 && currentFilters.status === null); // Oder genauer prüfen

                if (totalItems > previousDataCountRef.current && previousDataCountRef.current > 0 && currentPage === 1 && noFiltersApplied) {
                    const audio = new Audio('/newTicket.mp3');
                    audio.play().catch(error => console.error("Fehler beim Abspielen des Tons:", error));
                }
                previousDataCountRef.current = totalItems; // Gesamtzahl für den Vergleich
            } else {
                previousDataCountRef.current = 0;
            }
        }
    }, [items, isLoadingData, currentView, totalItems, currentPage, currentFilters]);

    useEffect(() => {
        if (currentView !== "statistik" && currentView !== "admin") {
            setShowAdvancedFilters(false);
        }
        setUiError(null);
        setCurrentPage(1); // Bei View-Wechsel immer auf Seite 1 starten
    }, [currentView]);

    // Wrapper für Filter-Hook-Funktionen, um Seite zurückzusetzen
    const handleApplyDateFilter = useCallback(() => {
        setCurrentPage(1);
        applyDateFilterFromHook();
    }, [applyDateFilterFromHook, setCurrentPage]);

    const handleClearDateFilter = useCallback(() => {
        setCurrentPage(1);
        clearDateFilterFromHook();
    }, [clearDateFilterFromHook, setCurrentPage]);


   const handleItemUpdate = useCallback(async (
    itemWithDesiredChanges: CardSpecificDataItem,
    file?: File | null // Datei ist optional
): Promise<void> => {
    console.log("[ContaintTable] handleItemUpdate: Aufgerufen. Item ID:", itemWithDesiredChanges.id, "Datei vorhanden:", !!file);
    if (file) {
        console.log("[ContaintTable] handleItemUpdate: Zu änderndes Item (mit Datei):", itemWithDesiredChanges, "Datei:", file.name);
    } else {
        console.log("[ContaintTable] handleItemUpdate: Zu änderndes Item (ohne Datei):", itemWithDesiredChanges);
    }

    if (!token) {
        console.error("[ContaintTable] handleItemUpdate: Kein Token vorhanden.");
        setUiError("Nicht autorisiert.");
        logout(); // logout-Funktion aus useAuth
        throw new Error("Nicht autorisiert.");
    }
    setUiError(null);

    const viewSpecificApiBase = API_ENDPOINTS[currentView as keyof typeof API_ENDPOINTS];
    if (!viewSpecificApiBase && currentView !== 'admin' && currentView !== 'statistik') {
        const errorMsg = `[ContaintTable] handleItemUpdate: Kein API Endpunkt für View '${currentView}' definiert.`;
        console.error(errorMsg);
        setUiError(errorMsg);
        throw new Error(errorMsg);
    }

    let serverConfirmedItem: CardSpecificDataItem = { ...itemWithDesiredChanges }; // Start mit den gewünschten Änderungen

    try {
        // Schritt 1: Datei-Upload, falls eine Datei vorhanden ist (nur für 'beschwerden')
        if (file && currentView === 'beschwerden' && viewSpecificApiBase) {
            console.log(`[ContaintTable] handleItemUpdate: Starte Datei-Upload für Item ${itemWithDesiredChanges.id} zu ${viewSpecificApiBase}/${itemWithDesiredChanges.id}/attachment`);
            
            const formData = new FormData();
            formData.append('attachment', file, file.name);

            // Wichtig: Wenn dein POST-Endpunkt auch Status oder internal_details erwartet, hier hinzufügen:
            // if (itemWithDesiredChanges.status) {
            //   formData.append('status', itemWithDesiredChanges.status);
            // }
            // if (itemWithDesiredChanges.internal_details) {
            //   formData.append('internal_details_json', JSON.stringify(itemWithDesiredChanges.internal_details));
            // }

            const uploadUrl = `${viewSpecificApiBase}/${itemWithDesiredChanges.id}/attachment`;
            console.log(`[ContaintTable] handleItemUpdate: FormData für Upload wird gesendet an: ${uploadUrl}`);

            const fileResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // Kein 'Content-Type', Browser setzt es für FormData
                body: formData,
            });

            const itemAfterUploadOrError = await fileResponse.json();

            if (!fileResponse.ok) {
                console.error("[ContaintTable] handleItemUpdate: Fehler beim Datei-Upload, Serverantwort:", itemAfterUploadOrError);
                if (fileResponse.status === 401) { logout(); setUiError("Sitzung abgelaufen."); throw new Error("Sitzung abgelaufen."); }
                throw new Error(itemAfterUploadOrError.message || itemAfterUploadOrError.details || itemAfterUploadOrError.error || `Fehler beim Hochladen der Datei (${fileResponse.status})`);
            }
            
            console.log("[ContaintTable] handleItemUpdate: Datei erfolgreich hochgeladen, Serverantwort:", itemAfterUploadOrError);
            // Aktualisiere serverConfirmedItem mit den Daten, die der Upload-Endpunkt zurückgibt
            // Dies ist wichtig, falls der Upload-Endpunkt auch Metadaten (wie Status, internal_details) aktualisiert und zurückgibt.
            serverConfirmedItem = { 
                ...itemWithDesiredChanges, // Nimm die ursprünglich gewünschten Änderungen
                ...itemAfterUploadOrError  // Überschreibe/ergänze mit dem, was der Server nach dem Upload zurückgibt
                                           // (z.B. attachment_filename, neuer Status etc.)
            };
            console.log("[ContaintTable] handleItemUpdate: Item-Status nach Datei-Upload:", serverConfirmedItem);
        }

        // Schritt 2: PATCH-Request für andere Metadaten (Status, internal_details etc.)
        // Erstelle das Payload für den PATCH-Request.
        // Es ist wichtig zu entscheiden, welche Daten hier gesendet werden sollen,
        // besonders wenn ein Datei-Upload vorausging.
        const payloadForPatch: PatchPayload = { id: serverConfirmedItem.id };
        let needsPatchCall = false;

        // Status nur senden, wenn er sich vom *ursprünglichen* Item unterscheidet oder explizit gesetzt wurde
        const originalItemFromCache = items.find(i => i.id === itemWithDesiredChanges.id);
        if (itemWithDesiredChanges.status && itemWithDesiredChanges.status !== originalItemFromCache?.status) {
            payloadForPatch.status = itemWithDesiredChanges.status;
            needsPatchCall = true;
        }

        // Interne Details nur senden, wenn sie sich geändert haben oder explizit Teil von itemWithDesiredChanges sind
        // und nicht nur vom Upload-Response stammen (es sei denn, das ist gewünscht).
        // Hier nehmen wir an, dass itemWithDesiredChanges.internal_details die zu speichernden Details sind.
        if (itemWithDesiredChanges.internal_details) {
            payloadForPatch.internal_details = itemWithDesiredChanges.internal_details;
            needsPatchCall = true;
        }
        
        // Spezifischer Fall für 'attachment_filename = null' (wenn ein Anhang gelöscht wurde)
        // Dies kommt von handleRemoveAttachment in DataItemCard, das onItemUpdate aufruft
        if (currentView === 'beschwerden' && 
            'attachment_filename' in itemWithDesiredChanges && 
            itemWithDesiredChanges.attachment_filename === null &&
            (!file) // Stelle sicher, dass nicht gleichzeitig eine neue Datei hochgeladen wird
           ) {
            payloadForPatch.attachment_filename = null; // Signalisiert Backend, den Anhang zu entfernen
            needsPatchCall = true;
        }


        if (needsPatchCall && viewSpecificApiBase) {
            console.log(`[ContaintTable] handleItemUpdate: Bereite PATCH-Request vor mit Payload:`, payloadForPatch, `an Endpunkt: ${viewSpecificApiBase}`);
            const patchResponse = await fetch(viewSpecificApiBase, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payloadForPatch),
            });

            const itemAfterPatchOrError = await patchResponse.json();

            if (!patchResponse.ok) {
                console.error("[ContaintTable] handleItemUpdate: Fehler beim PATCH-Request, Serverantwort:", itemAfterPatchOrError);
                if (patchResponse.status === 401) { logout(); setUiError("Sitzung abgelaufen."); throw new Error("Sitzung abgelaufen."); }
                throw new Error(itemAfterPatchOrError.details || itemAfterPatchOrError.error || `Fehler beim Speichern der Änderungen (${patchResponse.status})`);
            }
            serverConfirmedItem = itemAfterPatchOrError; // Das ist jetzt der final bestätigte Zustand
            console.log("[ContaintTable] handleItemUpdate: PATCH erfolgreich. Finaler Server-Status:", serverConfirmedItem);
        } else if (file && currentView === 'beschwerden' && !needsPatchCall) {
            console.log("[ContaintTable] handleItemUpdate: Datei wurde hochgeladen, kein weiterer PATCH-Call für Metadaten nötig (Payload war leer). Finaler Status vom Upload:", serverConfirmedItem);
        } else if (!needsPatchCall) {
             console.warn(`[ContaintTable] handleItemUpdate: Für Item ${serverConfirmedItem.id} wurde kein PATCH-Call ausgelöst, da keine relevanten Änderungen im Payload waren (oder kein Dateiupload stattfand).`);
        }

        // Wichtig: Aktualisiere den Cache mit dem finalen, vom Server bestätigten Item
        if (serverConfirmedItem && serverConfirmedItem.id) { // Prüfe ob serverConfirmedItem tatsächlich ein valides Item ist
            updateSingleItemInCache(serverConfirmedItem);
        } else {
            console.warn("[ContaintTable] handleItemUpdate: Kein valides serverConfirmedItem zum Aktualisieren des Caches vorhanden. Item:", serverConfirmedItem);
            // Ggf. die aktuelle Seite neu laden, um Konsistenz sicherzustellen
            await refetchData(currentView, currentPage, itemsPerPage, currentFilters);
        }

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler beim Aktualisieren des Eintrags.";
        console.error("[ContaintTable] handleItemUpdate: Kritischer Fehler in der Funktion:", err);
        setUiError(errorMessage);
        throw err; // Fehler weiterwerfen, damit die aufrufende Funktion (z.B. in DataItemCard) ihn fangen kann
    }
}, [token, logout, currentView, updateSingleItemInCache, setUiError, items, refetchData, currentPage, itemsPerPage, currentFilters]); // items und Refetch-Parameter für Optimistic Update und Fallbacks hinzugefügt

    const handleCopyToClipboard = useCallback(async ( /* ... wie zuvor ... */ ) => {
        // ... Deine Logik ...
    }, [setUiError, setCopiedCellKey]);

    const performStatusChangeAsync = useCallback(async (itemId: number, newStatus: AnyItemStatus, viewForApi: ViewType) => {
        if (!token || !user) { /* ... */ return; }
        
        const itemToUpdateOptimistically = items.find(i => i.id === itemId);
        if (itemToUpdateOptimistically) {
            const optimisticItem = { ...itemToUpdateOptimistically, status: newStatus } as CardSpecificDataItem;
            if (newStatus === "In Bearbeitung" && user) { optimisticItem.bearbeiter_id = user.userId; optimisticItem.bearbeiter_name = `${user.name} ${user.nachname}`; optimisticItem.action_required = undefined; }
            else if (newStatus === "Offen") { optimisticItem.bearbeiter_id = null; optimisticItem.bearbeiter_name = null; optimisticItem.abgeschlossenam = null; optimisticItem.action_required = "relock_ui"; }
            updateSingleItemInCache(optimisticItem);
        } else {
            console.warn("Item für optimistisches Update nicht auf aktueller Seite gefunden.");
            // In diesem Fall ist ein Refetch der aktuellen Seite nach der API-Antwort umso wichtiger.
        }

        setUiError(null);
        const apiEndpointKey = viewForApi as keyof typeof API_ENDPOINTS;
        const apiEndpoint = API_ENDPOINTS[apiEndpointKey];
        if (!apiEndpoint) { /* ... */ return; }

        try {
            const response = await fetch(apiEndpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ id: itemId, status: newStatus }), });
            const updatedItemFromServer: CardSpecificDataItem = await response.json(); // Immer parsen

            if (!response.ok) {
                 // Versuche, das optimistische Update zurückzurollen oder zumindest die Fehlermeldung anzuzeigen
                if (itemToUpdateOptimistically) updateSingleItemInCache(itemToUpdateOptimistically as CardSpecificDataItem); // Rolle zurück zum vorherigen Zustand des Items
                const errorData = updatedItemFromServer || {}; // Nutze geparste Antwort, falls vorhanden
                if (response.status === 401) { logout(); setUiError("Sitzung abgelaufen."); return; }
                throw new Error( (errorData as any).details || (errorData as any).error || `Statusupdate fehlgeschlagen (${response.status})`);
            }
            updateSingleItemInCache(updatedItemFromServer); // Bestätigtes Update

            // Nach erfolgreichem Update prüfen, ob ein Refetch der aktuellen Seite nötig ist,
            // falls sich das Item verschoben haben könnte (z.B. durch Filter nicht mehr auf dieser Seite).
            // Für den Moment belassen wir es beim Cache-Update. Ein vollständiger Refetch wäre:
            // await refetchData(currentView, currentPage, itemsPerPage, currentFilters, true); 

        } catch (err) {
            if (itemToUpdateOptimistically) updateSingleItemInCache(itemToUpdateOptimistically as CardSpecificDataItem); // Rollback
            setUiError(err instanceof Error ? err.message : `Statusupdate für ${VIEW_TITLES[viewForApi]} fehlgeschlagen.`);
        }
    }, [token, user, items, updateSingleItemInCache, setUiError, logout /*, currentView, currentPage, itemsPerPage, currentFilters, refetchData */]);


// In ContaintTable.tsx

const handleStatusChangeForCard = (
    itemId: number,             // Parameter 1 explizit deklariert
    newStatus: AnyItemStatus,   // Parameter 2 explizit deklariert
    itemTypeView: ViewType      // Parameter 3 explizit deklariert
): void => {
    // Jetzt sind itemId, newStatus und itemTypeView hier bekannt:
    if (itemTypeView === "beschwerden" || itemTypeView === "lob" || itemTypeView === "anregungen") {
        performStatusChangeAsync(itemId, newStatus, itemTypeView) // Korrekter Aufruf mit den bekannten Parametern
            .catch(err => console.error(`ContaintTable: Fehler bei performStatusChangeAsync für ${itemTypeView}:`, err));
    } else { 
        setUiError("Statusänderung in dieser Ansicht nicht möglich."); 
        setTimeout(() => setUiError(null), 3000); 
    }
};

    // NEU: Handler für Seitenwechsel
    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
            // Der useDataFetching-Hook wird durch die Änderung von `currentPage` automatisch neu laden.
        }
    };
    
    const handleItemsPerPageChange = (newLimit: number) => {
        setItemsPerPage(newLimit);
        setCurrentPage(1); // Bei Änderung der Items pro Seite immer auf Seite 1 zurück
    };


    if (isLoadingAuth && !isAuthenticated) { return <div className="text-center py-10">Authentifizierung wird geladen...</div>; }
    if (!isAuthenticated && !isLoadingAuth) { return <div className="text-center py-10">Bitte einloggen.</div>; }

    const displayError = dataFetchingError || uiError;
    const dataToDisplay = items; // Wir verwenden jetzt 'items' direkt

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#0D0D12] via-[#111318] to-[#0a0a0f] text-white font-sans relative pt-16 pb-16 overflow-hidden">
            <StatusBar isDbConnected={isDbConnected} lastDataUpdateTimestamp={lastDataUpdateTimestamp} />
            <motion.div className="w-full max-w-none p-4 md:p-8 mx-auto relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <ViewTabs currentView={currentView} setCurrentView={(view) => { setCurrentView(view); setCurrentPage(1);}} user={user} />
                <div className="flex flex-col md:flex-row justify-between items-center my-4">
                    <h1 className="text-xl md:text-4xl font-semibold text-neutral-200 text-center md:text-left mb-2 md:mb-0">{VIEW_TITLES[currentView] || "Übersicht"}</h1>
                </div>

                {currentView !== "statistik" && currentView !== "admin" && (
                    <FilterControls
                        currentView={currentView} activeStatusFilter={activeStatusFilter} setActiveStatusFilter={(val) => {setActiveStatusFilter(val); setCurrentPage(1);}}
                        searchTerm={searchTerm} setSearchTerm={(val) => {setSearchTerm(val); setCurrentPage(1);}}
                        emailSearchTerm={emailSearchTerm} setEmailSearchTerm={(val) => {setEmailSearchTerm(val); setCurrentPage(1);}}
                        idSearchTerm={idSearchTerm} setIdSearchTerm={(val) => {setIdSearchTerm(val); setCurrentPage(1);}}
                        assigneeSearchTerm={assigneeSearchTerm} setAssigneeSearchTerm={(val) => {setAssigneeSearchTerm(val); setCurrentPage(1);}}
                        haltestelleSearchTerm={haltestelleSearchTerm} setHaltestelleSearchTerm={(val) => {setHaltestelleSearchTerm(val); setCurrentPage(1);}}
                        linieSearchTerm={linieSearchTerm} setLinieSearchTerm={(val) => {setLinieSearchTerm(val); setCurrentPage(1);}}
                        showAdvancedFilters={showAdvancedFilters} setShowAdvancedFilters={setShowAdvancedFilters}
                        startDateInput={startDateInput} setStartDateInput={setStartDateInput} // Apply/Clear setzt Seite zurück
                        endDateInput={endDateInput} setEndDateInput={setEndDateInput}     // Apply/Clear setzt Seite zurück
                        handleApplyDateFilter={handleApplyDateFilter}
                        handleClearDateFilter={handleClearDateFilter}
                        isDateFilterApplied={isDateFilterApplied} cardAccentsEnabled={cardAccentsEnabled} setCardAccentsEnabled={setCardAccentsEnabled}
                        dateFilterTarget={dateFilterTarget} setDateFilterTarget={(val) => {setDateFilterTarget(val); setCurrentPage(1);}} />
                )}

                {displayError && currentView !== "statistik" && currentView !== "admin" && (
                    <div className="my-4 p-3 bg-red-700/80 text-red-100 border border-red-600 rounded-md shadow-lg" role="alert">
                        <p><strong>Fehler:</strong> {displayError}</p>
                    </div>
                )}

                {currentView === "admin" ? (<AdminSection />) :
                    currentView === "statistik" ? (<StatisticsView />) :
                        // Zeige Ladeindikator nur, wenn keine Daten vorhanden sind ODER ein Fehler aufgetreten ist und wir neu laden
                        isLoadingData && dataToDisplay.length === 0 ? (<div className="text-center py-10 text-neutral-400">Lade Daten...</div>) :
                            !isLoadingData && dataToDisplay.length === 0 && !dataFetchingError ? (
                                <div className="text-center py-10 text-neutral-500">Keine Einträge für die aktuellen Filter gefunden.</div>
                            ) : dataToDisplay.length > 0 && !dataFetchingError ? ( // Zeige Daten, auch wenn im Hintergrund geladen wird
                                <>
                                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                                        {dataToDisplay.map((item) => (
                                            <DataItemCard
                                                key={`${currentView}-${item.id}-${item.erstelltam || item.id}`} // Fallback für Key
                                                item={item as CardSpecificDataItem}
                                                currentView={currentView}
                                                copiedCellKey={copiedCellKey} onCopyToClipboard={handleCopyToClipboard}
                                                onStatusChange={(itemId, newStatus) => handleStatusChangeForCard(itemId, newStatus as AnyItemStatus, currentView)}
                                                cardAccentsEnabled={cardAccentsEnabled}
                                                onItemUpdate={handleItemUpdate}
                                            />
                                        ))}
                                    </motion.div>
                                    {console.log("[ContaintTable] Props to PaginationControls:", {
                                          currentPagePassed: currentPage,
                                          totalPagesPassed: totalPages,
                                          itemsPerPagePassed: itemsPerPage,
                                          totalItemsPassed: totalItems
                                      })}
                                    <PaginationControls
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={handlePageChange}
                                        itemsPerPage={itemsPerPage}
                                        setItemsPerPage={handleItemsPerPageChange}
                                        totalItems={totalItems}
                                    />
                                </>
                            ) : null // Falls Fehler und keine Daten, wird Fehler oben schon angezeigt
                }
            </motion.div>
        </div>
    );
}