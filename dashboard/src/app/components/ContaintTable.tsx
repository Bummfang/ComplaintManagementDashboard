"use client";

// motion bleibt für andere Animationen erhalten,
// MotionProps und MotionTransition könnten entfernt werden, wenn sie nur für BackgroundBlob benötigt wurden.
// Ich lasse sie vorerst drin, falls andere motion-Komponenten sie implizit nutzen könnten,
// aber wenn BackgroundBlob der einzige Nutzer war, können sie weg.
import { motion, MotionProps, Transition as MotionTransition } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from '../contexts/AuthContext';

import {
    DataItem, ViewType, StatusFilterMode, BeschwerdeItem,
    AnyItemStatus
} from '../types';
import { API_ENDPOINTS, VIEW_TITLES } from '../constants';
import StatusBar from './StatusBar';
import ViewTabs from './ViewTabs';
import FilterControls from './FilterControls';
import DataItemCard from './DataItemCard';
import StatisticsView from './StatisticsView';
import AdminSection from './AdminSection';

// Die Definition von BackgroundBlob, BackgroundBlobProps und AnimatableXYProperties wurde entfernt.

export type DateFilterTarget = 'erstelltam' | 'datum';

export default function ContaintTable() {
    const { isAuthenticated, user, token, isLoadingAuth, logout } = useAuth();

    const [currentView, setCurrentView] = useState<ViewType>("beschwerden");
    const [data, setData] = useState<(DataItem & { action_required?: "relock_ui" })[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedCellKey, setCopiedCellKey] = useState<string | null>(null);
    const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilterMode>("alle");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [emailSearchTerm, setEmailSearchTerm] = useState<string>("");
    const [idSearchTerm, setIdSearchTerm] = useState<string>("");
    const [haltestelleSearchTerm, setHaltestelleSearchTerm] = useState<string>("");
    const [linieSearchTerm, setLinieSearchTerm] = useState<string>("");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
    const [startDateInput, setStartDateInput] = useState<string>("");
    const [endDateInput, setEndDateInput] = useState<string>("");
    const [appliedStartDate, setAppliedStartDate] = useState<string | null>(null);
    const [appliedEndDate, setAppliedEndDate] = useState<string | null>(null);
    const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
    const [lastDataUpdateTimestamp, setLastDataUpdateTimestamp] = useState<Date | null>(null);
    const [cardAccentsEnabled, setCardAccentsEnabled] = useState<boolean>(true);
    const [dateFilterTarget, setDateFilterTarget] = useState<DateFilterTarget>('erstelltam');

    const fetchData = useCallback(async (view: ViewType, isBackgroundUpdate = false) => {
        if (view === "statistik" || view === "admin") {
            setIsLoadingData(false); setData([]); setError(null); return;
        }
        if (!token) {
            if (!isBackgroundUpdate) setIsLoadingData(false);
            console.warn("ContaintTable: fetchData called without a token."); return;
        }
        const apiEndpoint = API_ENDPOINTS[view];
        if (!apiEndpoint) {
            setIsLoadingData(false); const errorMessage = `Kein API Endpunkt definiert für die Ansicht: ${view}`;
            setError(errorMessage); console.error(errorMessage); return;
        }
        if (!isBackgroundUpdate) { setIsLoadingData(true); setError(null); }
        try {
            const response = await fetch(apiEndpoint, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
            if (!response.ok) {
                setIsDbConnected(false);
                const errorData = await response.json().catch(() => ({ error: `HTTP-Fehler ${response.status}`, details: response.statusText }));
                if (response.status === 401) { setError("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an."); logout(); return; }
                throw new Error(errorData.error || `Fehler beim Laden der Daten für '${VIEW_TITLES[view] || view}': Status ${response.status}`);
            }
            const fetchedDataFromApi: (DataItem & { action_required?: "relock_ui" })[] = await response.json();
            setData(fetchedDataFromApi);
            setIsDbConnected(true);
            setLastDataUpdateTimestamp(new Date());
            if (!isBackgroundUpdate) setError(null);
        } catch (err) {
            setIsDbConnected(false);
            setError(err instanceof Error ? err.message : "Ein unbekannter Fehler ist beim Laden der Daten aufgetreten.");
        } finally {
            if (!isBackgroundUpdate) setIsLoadingData(false);
        }
    }, [token, logout, setIsLoadingData, setData, setError, setIsDbConnected, setLastDataUpdateTimestamp, currentView]); // currentView zur useCallback Dependency hinzugefügt, da es in fetchData indirekt genutzt wird (VIEW_TITLES[view])

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchData(currentView);
            if (currentView !== "statistik" && currentView !== "admin") {
                setActiveStatusFilter("alle");
                setSearchTerm(""); setEmailSearchTerm(""); setIdSearchTerm("");
                setStartDateInput(""); setEndDateInput("");
                setAppliedStartDate(null); setAppliedEndDate(null);
                setShowAdvancedFilters(false);
                if (currentView !== "beschwerden") {
                    setHaltestelleSearchTerm(""); setLinieSearchTerm("");
                }
                setDateFilterTarget(currentView === "beschwerden" ? 'datum' : 'erstelltam');
            }
        } else if (!isLoadingAuth && !isAuthenticated) {
            setData([]);
        }
    }, [currentView, isAuthenticated, token, isLoadingAuth, fetchData]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (isAuthenticated && token && currentView !== "statistik" && currentView !== "admin") {
            intervalId = setInterval(() => { fetchData(currentView, true); }, 30000);
        }
        return () => clearInterval(intervalId);
    }, [currentView, isAuthenticated, token, fetchData]);

    const handleItemUpdate = useCallback((updatedItem: DataItem & { action_required?: "relock_ui" }) => {
        setData(prevData =>
            prevData.map(item =>
                (item.id === updatedItem.id && item.erstelltam === updatedItem.erstelltam)
                    ? { ...item, ...updatedItem }
                    : item
            )
        );
        setLastDataUpdateTimestamp(new Date());
        console.log(`ContaintTable: Item ${updatedItem.id} lokal durch onItemUpdate aktualisiert.`, updatedItem);
    }, [setData, setLastDataUpdateTimestamp]);

    const filteredData = useMemo(() => {
        let tempData = [...data];
        // Die console.logs für ID-Filterung können hier bleiben oder entfernt/angepasst werden.
        // Ich lasse sie vorerst drin, falls du sie noch brauchst.
        console.log("-----------------------------------------");
        console.log("ID-Filter: Start der Filterberechnung");
        console.log("ID-Filter: idSearchTerm (aus Input):", idSearchTerm);
        console.log("ID-Filter: Ursprüngliche tempData Länge:", tempData.length);
        if (currentView === "statistik" || currentView === "admin" || !data || data.length === 0) return [];

        if (activeStatusFilter !== "alle" && (currentView === "beschwerden" || currentView === "lob" || currentView === "anregungen")) {
            tempData = tempData.filter(item => 'status' in item && item.status === activeStatusFilter);
        }

        if (searchTerm.trim() !== "") {
            const lowerSearchTerm = searchTerm.trim().toLowerCase();
            tempData = tempData.filter(item => item.name?.toLowerCase().includes(lowerSearchTerm));
        }
        if (emailSearchTerm.trim() !== "") {
            const lowerEmailSearchTerm = emailSearchTerm.trim().toLowerCase();
            tempData = tempData.filter(item => item.email?.toLowerCase().includes(lowerEmailSearchTerm));
        }
        if (idSearchTerm.trim() !== "") {
            const trimmedIdSearchTerm = idSearchTerm.trim();
            const searchId = parseInt(trimmedIdSearchTerm, 10);
            if (!isNaN(searchId)) {
                console.log(`ID-Filter: Wende Filter an für searchId: ${searchId}.`);
                console.log(`ID-Filter: tempData VOR Filterung (nur IDs):`, JSON.parse(JSON.stringify(tempData.map(item => item.id))));
                tempData = tempData.filter(item => item.id === searchId);
                console.log(`ID-Filter: tempData NACH Filterung für searchId: ${searchId} (nur IDs):`, JSON.parse(JSON.stringify(tempData.map(item => item.id))));
            } else {
                console.log(`ID-Filter: idSearchTerm "${trimmedIdSearchTerm}" ist keine gültige Zahl. Leere tempData.`);
                tempData = [];
            }
        } else {
            console.log("ID-Filter: idSearchTerm ist leer, ID-Filter wird übersprungen.");
        }

        if (currentView === "beschwerden") {
            if (haltestelleSearchTerm.trim() !== "") {
                const lower = haltestelleSearchTerm.trim().toLowerCase();
                tempData = tempData.filter(item => 'haltestelle' in item && (item as BeschwerdeItem).haltestelle?.toLowerCase().includes(lower));
            }
            if (linieSearchTerm.trim() !== "") {
                const lower = linieSearchTerm.trim().toLowerCase();
                tempData = tempData.filter(item => 'linie' in item && (item as BeschwerdeItem).linie?.toLowerCase().includes(lower));
            }
        }

        if (appliedStartDate || appliedEndDate) {
            const sDate = appliedStartDate ? new Date(appliedStartDate) : null;
            const eDate = appliedEndDate ? new Date(appliedEndDate) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            if (eDate) eDate.setHours(23, 59, 59, 999);
            tempData = tempData.filter(item => {
                let dateStringToFilter: string | null = item.erstelltam;
                if (dateFilterTarget === 'datum' && currentView === 'beschwerden' && 'datum' in item) {
                    dateStringToFilter = (item as BeschwerdeItem).datum;
                }
                if (!dateStringToFilter) return false;
                try {
                    const itemDate = new Date(dateStringToFilter);
                    if (dateFilterTarget === 'datum' && currentView === 'beschwerden' && dateStringToFilter.length === 10) {
                        const [year, month, day] = dateStringToFilter.split('-').map(Number);
                        itemDate.setFullYear(year, month - 1, day); itemDate.setHours(0, 0, 0, 0);
                    }
                    if (isNaN(itemDate.getTime())) return false;
                    let match = true;
                    if (sDate && itemDate < sDate) match = false;
                    if (eDate && itemDate > eDate) match = false;
                    return match;
                } catch (e) {
                    console.log(e);
                    return false;
                }
            });
        }
        return tempData;
    }, [data, currentView, activeStatusFilter, appliedStartDate, appliedEndDate, dateFilterTarget, searchTerm, emailSearchTerm, idSearchTerm, haltestelleSearchTerm, linieSearchTerm]);

    const handleCopyToClipboard = useCallback(async (textToCopy: string, cellKey: string) => {
        if (!textToCopy) {
            console.warn("handleCopyToClipboard: Kein Text zum Kopieren übergeben."); return;
        }
        if (!navigator.clipboard) {
            console.error("handleCopyToClipboard: Clipboard API nicht verfügbar.");
            setError("Kopieren nicht möglich: Clipboard API nicht unterstützt oder nicht sicher (HTTPS benötigt).");
            setTimeout(() => setError(null), 3000); return;
        }
        try {
            await navigator.clipboard.writeText(textToCopy);
            console.log(`ContaintTable: Text erfolgreich in Zwischenablage kopiert für Key ${cellKey}: "${textToCopy}"`);
            setCopiedCellKey(cellKey);
            setTimeout(() => setCopiedCellKey(null), 1500);
        } catch (err) {
            console.error("handleCopyToClipboard: Fehler beim Kopieren in die Zwischenablage:", err);
            setError("Kopieren in die Zwischenablage fehlgeschlagen.");
            setTimeout(() => setError(null), 3000);
            setCopiedCellKey(null);
        }
    }, [setCopiedCellKey, setError]);

    const performStatusChangeAsync = useCallback(async (itemId: number, newStatus: AnyItemStatus, viewForApi: ViewType) => {
        if (!token) { setError("Nicht autorisiert für Statusänderung."); logout(); return; }
        setError(null);
        const apiEndpoint = API_ENDPOINTS[viewForApi];
        if (!apiEndpoint) {
            setError(`API Endpunkt für ${VIEW_TITLES[viewForApi]} nicht definiert.`); return;
        }
        try {
            const response = await fetch(apiEndpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ id: itemId, status: newStatus }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 401) { setError("Sitzung abgelaufen."); logout(); return; }
                throw new Error(errorData.details || errorData.error || `Statusupdate fehlgeschlagen (${response.status})`);
            }
            fetchData(currentView, true); // fetchData benötigt currentView
            console.log(`ContaintTable: Status für Item ${itemId} geändert, Daten werden neu geladen.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Statusupdate für ${VIEW_TITLES[viewForApi]} fehlgeschlagen.`);
        }
    }, [token, currentView, fetchData, logout, setError]);

    const handleStatusChangeForCard = (itemId: number, newStatus: AnyItemStatus, itemTypeView: ViewType): void => {
        if (itemTypeView === "beschwerden" || itemTypeView === "lob" || itemTypeView === "anregungen") {
            performStatusChangeAsync(itemId, newStatus, itemTypeView).catch(err => console.error(`ContaintTable: Fehler bei performStatusChangeAsync für ${itemTypeView}:`, err));
        } else {
            setError("Statusänderung in dieser Ansicht nicht möglich."); setTimeout(() => setError(null), 3000);
        }
    };

    const handleApplyDateFilter = useCallback(() => {
        setAppliedStartDate(startDateInput || null);
        setAppliedEndDate(endDateInput || null);
        console.log(`Datumsfilter angewendet: Start=${startDateInput || 'N/A'}, Ende=${endDateInput || 'N/A'}`);
    }, [startDateInput, endDateInput, setAppliedStartDate, setAppliedEndDate]);
    const handleClearDateFilter = useCallback(() => {
        setStartDateInput("");
        setEndDateInput("");
        setAppliedStartDate(null);
        setAppliedEndDate(null);
        console.log("Datumsfilter zurückgesetzt.");
    }, [setStartDateInput, setEndDateInput, setAppliedStartDate, setAppliedEndDate]);
    const isDateFilterApplied = useMemo(() => !!(appliedStartDate || appliedEndDate), [appliedStartDate, appliedEndDate]);

    if (isLoadingAuth) { return <div className="text-center py-10">Authentifizierung wird geladen...</div> }
    if (!isAuthenticated) { return <div className="text-center py-10">Bitte einloggen.</div>; }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#0D0D12] via-[#111318] to-[#0a0a0f] text-white font-sans relative pt-16 pb-16 overflow-hidden">
            {/* BackgroundBlob-Aufrufe wurden hier entfernt */}

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
                        idSearchTerm={idSearchTerm} setIdSearchTerm={setIdSearchTerm} haltestelleSearchTerm={haltestelleSearchTerm} setHaltestelleSearchTerm={setHaltestelleSearchTerm}
                        linieSearchTerm={linieSearchTerm} setLinieSearchTerm={setLinieSearchTerm} showAdvancedFilters={showAdvancedFilters} setShowAdvancedFilters={setShowAdvancedFilters}
                        startDateInput={startDateInput} setStartDateInput={setStartDateInput} endDateInput={endDateInput} setEndDateInput={setEndDateInput}
                        handleApplyDateFilter={handleApplyDateFilter} handleClearDateFilter={handleClearDateFilter} isDateFilterApplied={isDateFilterApplied}
                        cardAccentsEnabled={cardAccentsEnabled} setCardAccentsEnabled={setCardAccentsEnabled} dateFilterTarget={dateFilterTarget} setDateFilterTarget={setDateFilterTarget}
                    />
                )}

                {error && currentView !== "statistik" && currentView !== "admin" && (<div className="my-4 p-3 bg-red-700/80 text-red-100 border border-red-600 rounded-md shadow-lg" role="alert"> <p><strong>Fehler:</strong> {error}</p> </div>)}

                {currentView === "admin" ? (<AdminSection />) :
                    currentView === "statistik" ? (<StatisticsView />) :
                        isLoadingData && !error ? (<div className="text-center py-10 text-neutral-400">Lade Daten...</div>) :
                            !isLoadingData && filteredData.length === 0 && !error ? (
                                <div className="text-center py-10 text-neutral-500">
                                    Keine Einträge für
                                    {searchTerm.trim() && ` Person "${searchTerm}"`}
                                    gefunden.
                                </div>
                            ) : !isLoadingData && filteredData.length > 0 && !error ? (
                                <>
                                    {console.log("%cRENDERING filteredData (IDs):", "color:lime; font-weight:bold;", JSON.parse(JSON.stringify(filteredData.map(item => item.id))))}
                                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                                        {filteredData.map((item) => (
                                            <DataItemCard
                                                key={`${currentView}-${item.id}`}
                                                item={item} currentView={currentView}
                                                copiedCellKey={copiedCellKey} onCopyToClipboard={handleCopyToClipboard}
                                                onStatusChange={(itemId, newStatus) => handleStatusChangeForCard(itemId, newStatus as AnyItemStatus, currentView)}
                                                cardAccentsEnabled={cardAccentsEnabled}
                                                onItemUpdate={handleItemUpdate}
                                            />
                                        ))}
                                    </motion.div>
                                </>
                            ) : null}
            </motion.div>
        </div>
    );
}