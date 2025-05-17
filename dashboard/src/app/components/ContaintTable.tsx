// app/components/ContaintTable.tsx
"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";

// Importiere ausgelagerte Typen, Konstanten und Utils
import { DataItem, ViewType, StatusFilterMode, BeschwerdeItem } from '../types';
import { API_ENDPOINTS, VIEW_TITLES, FILTER_LABELS } from '../constants';
// formatDate, formatTime, formatLastUpdateTime werden jetzt in StatusBar und DataItemCard direkt verwendet oder dorthin übergeben

// Importiere die neuen Komponenten
import StatusBar from './StatusBar';
import ViewTabs from './ViewTabs';
import FilterControls from './FilterControls';
import DataItemCard from './DataItemCard';

export default function ContaintTable() {
    const [currentView, setCurrentView] = useState<ViewType>("beschwerden");
    const [data, setData] = useState<DataItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedCellKey, setCopiedCellKey] = useState<string | null>(null); // Wird an DataItemCard weitergegeben
    const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilterMode>("alle");

    const [searchTerm, setSearchTerm] = useState<string>("");
    const [emailSearchTerm, setEmailSearchTerm] = useState<string>("");
    const [idSearchTerm, setIdSearchTerm] = useState<string>("");

    const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
    const [startDateInput, setStartDateInput] = useState<string>("");
    const [endDateInput, setEndDateInput] = useState<string>("");
    const [appliedStartDate, setAppliedStartDate] = useState<string | null>(null);
    const [appliedEndDate, setAppliedEndDate] = useState<string | null>(null);

    const [isDbConnected, setIsDbConnected] = useState<boolean>(true); // Für StatusBar
    const [lastDataUpdateTimestamp, setLastDataUpdateTimestamp] = useState<Date | null>(null); // Für StatusBar

    // fetchData Logik bleibt hier, da sie den Haupt-Datenfluss steuert
    const fetchData = useCallback(async (view: ViewType, isBackgroundUpdate = false) => {
        if (!isBackgroundUpdate) { setIsLoading(true); setError(null); }
        try {
            const response = await fetch(API_ENDPOINTS[view]);
            if (!response.ok) {
                setIsDbConnected(false);
                const errorText = await response.text();
                throw new Error(`Fehler: Status ${response.status} - ${errorText.substring(0, 100)}`);
            }
            const fetchedData: DataItem[] = await response.json();
            setData(fetchedData);
            setIsDbConnected(true);
            setLastDataUpdateTimestamp(new Date());
            if (!isBackgroundUpdate) setError(null);
        } catch (err) {
            setIsDbConnected(false);
            setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
        } finally {
            if (!isBackgroundUpdate) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(currentView);
        setActiveStatusFilter("alle");
        setSearchTerm("");
        setEmailSearchTerm("");
        setIdSearchTerm("");
        setStartDateInput("");
        setEndDateInput("");
        setAppliedStartDate(null);
        setAppliedEndDate(null);
        setShowAdvancedFilters(false);
    }, [currentView, fetchData]);

    useEffect(() => {
        const intervalId = setInterval(() => { fetchData(currentView, true); }, 30000);
        return () => clearInterval(intervalId);
    }, [currentView, fetchData]);

    const filteredData = useMemo(() => {
        let tempData = [...data];
        if (currentView === "beschwerden" && activeStatusFilter !== "alle") {
            tempData = tempData.filter(item => {
                if ("status" in item) { const beschwerde = item as BeschwerdeItem; return beschwerde.status === activeStatusFilter; }
                return false;
            });
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
            if (!isNaN(searchId)) {
                tempData = tempData.filter(item => item.id === searchId);
            }
        }
        if (appliedStartDate || appliedEndDate) {
            const sDate = appliedStartDate ? new Date(appliedStartDate) : null;
            const eDate = appliedEndDate ? new Date(appliedEndDate) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            if (eDate) eDate.setHours(23, 59, 59, 999);
            tempData = tempData.filter(item => {
                try {
                    const itemDate = new Date(item.erstelltam);
                    if (isNaN(itemDate.getTime())) return false;
                    let match = true;
                    if (sDate && itemDate < sDate) match = false;
                    if (eDate && itemDate > eDate) match = false;
                    return match;
                } catch (e) { 
                    console.log(e);
                    return false; }
            });
        }
        return tempData;
    }, [data, currentView, activeStatusFilter, appliedStartDate, appliedEndDate, searchTerm, emailSearchTerm, idSearchTerm]);

    const handleCopyToClipboard = async (textToCopy: string, cellKey: string) => {
        if (!textToCopy) return;
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopiedCellKey(cellKey);
            setTimeout(() => setCopiedCellKey(null), 1500);
        }
        catch (err) {
            setError("Kopieren fehlgeschlagen.");
            console.log(err);
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleStatusChange = async (itemId: number, newStatus: BeschwerdeItem["status"]) => {
        const originalData = [...data];
        setData(prevData => prevData.map(item => item.id === itemId && 'status' in item ? { ...item, status: newStatus } as BeschwerdeItem : item));
        setError(null);
        try {
            const response = await fetch(API_ENDPOINTS.beschwerden, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ id: itemId, status: newStatus }),
            });
            if (!response.ok) {
                setData(originalData);
                const errorData = await response.json().catch(() => ({ details: response.statusText }));
                throw new Error(`Update fehlgeschlagen (${response.status}): ${errorData.details || errorData.error || "Serverfehler"}`);
            }
            fetchData(currentView, true);
        } catch (err) {
            setData(originalData);
            setError(err instanceof Error ? err.message : "Statusupdate fehlgeschlagen.");
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleApplyDateFilter = () => { setAppliedStartDate(startDateInput || null); setAppliedEndDate(endDateInput || null); };
    const handleClearDateFilter = () => { setStartDateInput(""); setEndDateInput(""); setAppliedStartDate(null); setAppliedEndDate(null); };
    const isDateFilterApplied = useMemo(() => !!(appliedStartDate || appliedEndDate), [appliedStartDate, appliedEndDate]);

    return (
        <div className="min-h-screen w-full bg-[#0D0D12] text-white font-sans">
            <StatusBar
                isDbConnected={isDbConnected}
                lastDataUpdateTimestamp={lastDataUpdateTimestamp}
            />

            <motion.div
                className="w-full max-w-none mt-10 p-4 md:p-8 mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <ViewTabs currentView={currentView} setCurrentView={setCurrentView} />

                <h1 className="text-xl md:text-2xl font-semibold mb-2 text-neutral-200">
                    {VIEW_TITLES[currentView]}
                </h1>

                <FilterControls
                    currentView={currentView}
                    activeStatusFilter={activeStatusFilter}
                    setActiveStatusFilter={setActiveStatusFilter}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    emailSearchTerm={emailSearchTerm}
                    setEmailSearchTerm={setEmailSearchTerm}
                    idSearchTerm={idSearchTerm}
                    setIdSearchTerm={setIdSearchTerm}
                    showAdvancedFilters={showAdvancedFilters}
                    setShowAdvancedFilters={setShowAdvancedFilters}
                    startDateInput={startDateInput}
                    setStartDateInput={setStartDateInput}
                    endDateInput={endDateInput}
                    setEndDateInput={setEndDateInput}
                    handleApplyDateFilter={handleApplyDateFilter}
                    handleClearDateFilter={handleClearDateFilter}
                    isDateFilterApplied={isDateFilterApplied}
                />

                {error && (
                    <div className="my-4 p-3 bg-red-700 text-white rounded-md shadow-lg" role="alert">
                        <p><strong>Fehler:</strong> {error}</p>
                    </div>
                )}

                {isLoading && !error ? (
                    <div className="text-center py-10 text-neutral-300">Lade Daten...</div>
                ) : !isLoading && filteredData.length === 0 && !error ? (
                    <div className="text-center py-10 text-neutral-500">
                        Keine Einträge für
                        {searchTerm.trim() !== "" && ` Person "${searchTerm}"`}
                        {emailSearchTerm.trim() !== "" && `${searchTerm.trim() !== "" ? ' und' : ''} E-Mail "${emailSearchTerm}"`}
                        {idSearchTerm.trim() !== "" && `${(searchTerm.trim() !== "" || emailSearchTerm.trim() !== "") ? ' und' : ''} ID "${idSearchTerm}"`}
                        {currentView === "beschwerden" && activeStatusFilter !== "alle" && `${(searchTerm.trim() !== "" || emailSearchTerm.trim() !== "" || idSearchTerm.trim() !== "") ? ' und' : ''} Status "${FILTER_LABELS[activeStatusFilter]}"`}
                        {(appliedStartDate || appliedEndDate) && `${(searchTerm.trim() !== "" || emailSearchTerm.trim() !== "" || idSearchTerm.trim() !== "" || (currentView === "beschwerden" && activeStatusFilter !== "alle")) ? ' und' : ''} im gewählten Zeitraum`}
                        {searchTerm.trim() === "" && emailSearchTerm.trim() === "" && idSearchTerm.trim() === "" && (currentView !== "beschwerden" || activeStatusFilter === "alle") && !(appliedStartDate || appliedEndDate) && ` die Ansicht "${VIEW_TITLES[currentView]}"`}
                        gefunden.
                    </div>
                ) : !isLoading && filteredData.length > 0 && !error ? (
                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" >
                        {filteredData.map((item) => (
                            <DataItemCard
                                key={item.id}
                                item={item}
                                currentView={currentView}
                                copiedCellKey={copiedCellKey}
                                onCopyToClipboard={handleCopyToClipboard}
                                onStatusChange={handleStatusChange}
                            />
                        ))}
                    </motion.div>
                ) : null}
            </motion.div>
        </div>
    );
}