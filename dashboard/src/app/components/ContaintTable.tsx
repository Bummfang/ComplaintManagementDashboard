// app/components/ContaintTable.tsx
"use client";

import { motion, MotionProps, Transition as MotionTransition } from "framer-motion"; // MotionProps und Transition importiert, falls für BackgroundBlob benötigt
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from '../contexts/AuthContext';
// useRouter importieren, falls noch nicht geschehen und für Redirects benötigt wird (aktuell nicht im Code genutzt)
// import { useRouter } from 'next/navigation'; 

import {
    DataItem, ViewType, StatusFilterMode, BeschwerdeItem, // BeschwerdeItem für Typ-Casts
    LobItem, AnregungItem, AnyItemStatus
} from '../types';
import { API_ENDPOINTS, VIEW_TITLES, FILTER_LABELS } from '../constants';
import StatusBar from './StatusBar';
import ViewTabs from './ViewTabs';
import FilterControls from './FilterControls';
import DataItemCard from './DataItemCard';
import StatisticsView from './StatisticsView';
import AdminSection from './AdminSection';

interface BackgroundBlobProps {
    className: string;
    animateProps: MotionProps['animate'];
    transitionProps: MotionTransition;
}
type AnimatableXYProperties = {
    x?: string | number | string[] | number[];
    y?: string | number | string[] | number[];
};
const BackgroundBlob = ({ className, animateProps, transitionProps }: BackgroundBlobProps) => {
    const initialMotionValues: MotionProps['initial'] = { scale: 0.8, opacity: 0, };
    if (typeof animateProps === 'object' && animateProps !== null && !Array.isArray(animateProps)) {
        const target = animateProps as AnimatableXYProperties;
        if (target.x && Array.isArray(target.x) && typeof target.x[0] === 'number') { initialMotionValues.x = target.x[0]; }
        if (target.y && Array.isArray(target.y) && typeof target.y[0] === 'number') { initialMotionValues.y = target.y[0]; }
    }
    return (<motion.div className={`absolute rounded-full filter blur-xl pointer-events-none ${className}`} initial={initialMotionValues} animate={animateProps} transition={transitionProps} />);
};

export type DateFilterTarget = 'erstelltam' | 'datum';

export default function ContaintTable() {
    const { isAuthenticated, user, token, isLoadingAuth, logout } = useAuth();
    // const router = useRouter(); // Einkommentieren, falls benötigt

    const [currentView, setCurrentView] = useState<ViewType>("beschwerden");
    const [data, setData] = useState<(DataItem & { action_required?: "relock_ui" })[]>([]); // Typ angepasst, um action_required zu erlauben
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
            const fetchedDataFromApi: (DataItem & { action_required?: "relock_ui" })[] = await response.json(); // API kann action_required senden
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
    }, [token, logout, setIsLoadingData, setData, setError, setIsDbConnected, setLastDataUpdateTimestamp]); // Abhängigkeiten vervollständigt

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


    // handleItemUpdate ist jetzt hier korrekt definiert
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

        if (currentView === "statistik" || currentView === "admin" || !data || data.length === 0) return [];
        let tempData = [...data];

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
            const searchId = parseInt(idSearchTerm.trim(), 10);
            if (!isNaN(searchId)) { tempData = tempData.filter(item => item.id === searchId); }
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
                } catch (e) { return false; }
            });
        }
        return tempData;
    }, [data, currentView, activeStatusFilter, appliedStartDate, appliedEndDate, dateFilterTarget, searchTerm, emailSearchTerm, idSearchTerm, haltestelleSearchTerm, linieSearchTerm]);

    const handleCopyToClipboard = useCallback(async (textToCopy: string, cellKey: string) => {
        if (!textToCopy) {
            console.warn("handleCopyToClipboard: Kein Text zum Kopieren übergeben.");
            return;
        }

        if (!navigator.clipboard) {
            console.error("handleCopyToClipboard: Clipboard API nicht verfügbar.");
            setError("Kopieren nicht möglich: Clipboard API nicht unterstützt oder nicht sicher (HTTPS benötigt).");
            setTimeout(() => setError(null), 3000); // Fehlermeldung nach 3 Sek. ausblenden
            return;
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            console.log(`ContaintTable: Text erfolgreich in Zwischenablage kopiert für Key ${cellKey}: "${textToCopy}"`);
            setCopiedCellKey(cellKey); // UI-Feedback für die spezifische Zelle aktivieren
            setTimeout(() => setCopiedCellKey(null), 1500); // Feedback nach 1.5 Sek. zurücksetzen
        } catch (err) {
            console.error("handleCopyToClipboard: Fehler beim Kopieren in die Zwischenablage:", err);
            setError("Kopieren in die Zwischenablage fehlgeschlagen.");
            setTimeout(() => setError(null), 3000); // Fehlermeldung nach 3 Sek. ausblenden
            setCopiedCellKey(null); // Sicherstellen, dass kein "Kopiert"-Feedback aktiv bleibt
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
            fetchData(currentView, true);
            console.log(`ContaintTable: Status für Item ${itemId} geändert, Daten werden neu geladen.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Statusupdate für ${VIEW_TITLES[viewForApi]} fehlgeschlagen.`);
        }
    }, [token, currentView, fetchData, logout, setError]); // Abhängigkeiten vervollständigt

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
        // Optional: Konsolenausgabe für Debugging
        console.log(`Datumsfilter angewendet: Start=${startDateInput || 'N/A'}, Ende=${endDateInput || 'N/A'}`);
    }, [startDateInput, endDateInput, setAppliedStartDate, setAppliedEndDate]); // Abhängigkeiten hinzugefügt
    const handleClearDateFilter = useCallback(() => {
        setStartDateInput("");
        setEndDateInput("");
        setAppliedStartDate(null);
        setAppliedEndDate(null);
        // Optional: Konsolenausgabe für Debugging
        console.log("Datumsfilter zurückgesetzt.");
    }, [setStartDateInput, setEndDateInput, setAppliedStartDate, setAppliedEndDate]); // Abhängigkeiten hinzugefügt
    const isDateFilterApplied = useMemo(() => !!(appliedStartDate || appliedEndDate), [appliedStartDate, appliedEndDate]);

    if (isLoadingAuth) { return <div className="text-center py-10">Authentifizierung wird geladen...</div> }
    if (!isAuthenticated) { return <div className="text-center py-10">Bitte einloggen.</div>; }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#0D0D12] via-[#111318] to-[#0a0a0f] text-white font-sans relative pt-16 pb-16 overflow-hidden">
            <BackgroundBlob className="w-[700px] h-[700px] bg-sky-900/80 -top-1/4 -left-1/3" animateProps={{ x: [-200, 100, -200], y: [-150, 80, -150], rotate: [0, 100, 0], scale: [1, 1.2, 1], opacity: [0.03, 0.08, 0.03] }} transitionProps={{ duration: 55, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} />
            <BackgroundBlob className="w-[800px] h-[800px] bg-emerald-800/70 -bottom-1/3 -right-1/4" animateProps={{ x: [150, -100, 150], y: [100, -80, 100], rotate: [0, -120, 0], scale: [1.1, 1.3, 1.1], opacity: [0.04, 0.09, 0.04] }} transitionProps={{ duration: 60, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} />
            <BackgroundBlob className="w-[900px] h-[900px] bg-slate-700/60 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" animateProps={{ scale: [1, 1.1, 1], opacity: [0.02, 0.05, 0.02] }} transitionProps={{ duration: 70, repeat: Infinity, repeatType: "mirror", ease: "linear" }} />

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
                            ) : null}
            </motion.div>
        </div>
    );
}