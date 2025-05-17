// app/components/ContaintTable.tsx
"use client";
import { motion } from "framer-motion";
import Image from 'next/image';
import { useEffect, useState, useCallback, useMemo } from "react";
import {
    CopyIcon, CheckIcon, SearchIcon, XIcon, MailIcon,
    FilterIcon, HashIcon, RefreshCwIcon
} from "lucide-react";

// Importiere ausgelagerte Typen, Konstanten und Utils
import { DataItem, ViewType, StatusFilterMode, BeschwerdeItem } from '../types'; // Pfad anpassen
import { API_ENDPOINTS, VIEW_TITLES, FILTER_LABELS } from '../constants'; // Pfad anpassen
import { formatDate, formatTime, formatLastUpdateTime } from '../utils'; // Pfad anpassen

// Komponente für einzelne Datenfelder (könnte auch in eine eigene Datei)
const DataField = ({ label, value, onCopy, isCopied, copyValue, fieldKey }: { label: string, value?: string | null, onCopy: (text: string, key: string) => void, isCopied: boolean, copyValue?: string, fieldKey: string }) => {
    const displayValue = value || "N/A";
    const actualCopyValue = copyValue || displayValue;
    return (
        <div className="py-1.5">
            <span className="text-xs text-slate-400 block">{label}</span>
            <div className="flex items-center group">
                <span className="text-slate-100 break-words">{displayValue}</span>
                {displayValue !== "N/A" && (
                    <button
                        onClick={() => onCopy(actualCopyValue, fieldKey)}
                        className="ml-2 p-0.5 text-slate-400 hover:text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={isCopied ? "Kopiert!" : "Kopieren"}
                    >
                        {isCopied ? <CheckIcon size={14} className="text-green-400"/> : <CopyIcon size={14} />}
                    </button>
                )}
            </div>
        </div>
    );
};


export default function ContaintTable() {
    const [currentView, setCurrentView] = useState<ViewType>("beschwerden");
    const [data, setData] = useState<DataItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedCellKey, setCopiedCellKey] = useState<string | null>(null);
    const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilterMode>("alle");
    
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [emailSearchTerm, setEmailSearchTerm] = useState<string>("");
    const [idSearchTerm, setIdSearchTerm] = useState<string>(""); 

    const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
    const [startDateInput, setStartDateInput] = useState<string>("");
    const [endDateInput, setEndDateInput] = useState<string>("");
    const [appliedStartDate, setAppliedStartDate] = useState<string | null>(null);
    const [appliedEndDate, setAppliedEndDate] = useState<string | null>(null);

    const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
    const [currentTime, setCurrentTime] = useState<string>("--:--:--");
    const [currentDate, setCurrentDate] = useState<string>("--.--.----");
    const [lastDataUpdateTimestamp, setLastDataUpdateTimestamp] = useState<Date | null>(null);

    // useEffect für Datum/Zeit (könnte in eine separate Header/Statusleisten-Komponente)
    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setCurrentDate(formatDate(now.toISOString(), { day: '2-digit', month: 'long', year: 'numeric' }));
        };
        updateDateTime();
        const timerId = setInterval(updateDateTime, 1000);
        return () => clearInterval(timerId);
    }, []);

    const fetchData = useCallback(async (view: ViewType, isBackgroundUpdate = false) => {
        if (!isBackgroundUpdate) { setIsLoading(true); setError(null); }
        try {
            const response = await fetch(API_ENDPOINTS[view]);
            if (!response.ok) { 
                setIsDbConnected(false); 
                const errorText = await response.text(); 
                throw new Error(`Fehler: Status ${response.status} - ${errorText.substring(0,100)}`); 
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
    }, []); // Keine Abhängigkeiten, da API_ENDPOINTS konstant sind

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
                } catch (e) { return false; }
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
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleStatusChange = async (itemId: number, newStatus: BeschwerdeItem["status"]) => {
        const originalData = [...data];
        setData(prevData => prevData.map(item => item.id === itemId && 'status' in item ? { ...item, status: newStatus } as BeschwerdeItem : item ));
        setError(null);
        try {
            const response = await fetch(API_ENDPOINTS.beschwerden, { // Beachte: API_ENDPOINTS.beschwerden ist hier fest codiert, ggf. anpassen falls Statusänderung für andere Typen kommt
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ id: itemId, status: newStatus }),
            });
            if (!response.ok) {
                setData(originalData);
                const errorData = await response.json().catch(() => ({ details: response.statusText }));
                throw new Error(`Update fehlgeschlagen (${response.status}): ${errorData.details || errorData.error || "Serverfehler"}`);
            }
            fetchData(currentView, true); // Daten neu laden, um Konsistenz sicherzustellen
        } catch (err) {
            setData(originalData);
            setError(err instanceof Error ? err.message : "Statusupdate fehlgeschlagen.");
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleApplyDateFilter = () => { setAppliedStartDate(startDateInput || null); setAppliedEndDate(endDateInput || null); };
    const handleClearDateFilter = () => { setStartDateInput(""); setEndDateInput(""); setAppliedStartDate(null); setAppliedEndDate(null); };
    
    const isDateFilterApplied = useMemo(() => appliedStartDate || appliedEndDate, [appliedStartDate, appliedEndDate]);

    // renderDataItemCard bleibt hier, da es stark von den States dieser Komponente abhängt
    // oder wird in eine eigene Komponente `DataItemCard.tsx` ausgelagert und erhält Props
    const renderDataItemCard = (item: DataItem) => {
        const itemTypePrefix = currentView === "beschwerden" ? "CMP-" : currentView === "lob" ? "LOB-" : "ANG-";
        const isBeschwerde = currentView === 'beschwerden' && 'beschwerdegrund' in item;
        const beschwerdeItem = isBeschwerde ? item as BeschwerdeItem : null;
        const currentStatus = beschwerdeItem?.status;
        let actionButton = null;

        if (isBeschwerde && beschwerdeItem) {
            switch (currentStatus) {
                case "Offen": actionButton = ( <button onClick={() => handleStatusChange(item.id, "In Bearbeitung")} className="w-full mt-3 text-yellow-300 hover:text-yellow-200 bg-yellow-600/30 hover:bg-yellow-600/50 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold" title="Bearbeitung starten" > Bearbeitung starten </button> ); break;
                case "In Bearbeitung": actionButton = ( <div className="flex space-x-2 mt-3"> <button onClick={() => handleStatusChange(item.id, "Gelöst")} className="flex-1 text-green-300 hover:text-green-200 bg-green-600/30 hover:bg-green-600/50 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold" title="Als gelöst markieren" > Gelöst </button> <button onClick={() => handleStatusChange(item.id, "Abgelehnt")} className="flex-1 text-red-300 hover:text-red-200 bg-red-600/30 hover:bg-red-600/50 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold" title="Ablehnen" > Ablehnen </button> </div> ); break;
                case "Gelöst": case "Abgelehnt": actionButton = ( <button onClick={() => handleStatusChange(item.id, "Offen")} className="w-full mt-3 text-purple-300 hover:text-purple-200 bg-purple-600/30 hover:bg-purple-600/50 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold" title="Wieder öffnen" > Wieder öffnen </button> ); break;
                default: actionButton = <div className="mt-3 text-xs text-neutral-500 italic">(Status unklar)</div>;
            }
        }
        const cardKey = `card-${item.id}`;
        return (
            <motion.div key={cardKey} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="bg-[#1A1A2E] p-4 rounded-xl shadow-lg border border-slate-700/50 flex flex-col justify-between" >
                <div>
                    <div className="flex justify-between items-start mb-2"> <h3 className="text-base font-semibold text-green-400 break-words"> {item.betreff} </h3> <span className="text-xs text-slate-400 whitespace-nowrap ml-2">ID: {itemTypePrefix}{item.id}</span> </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 text-xs">
                        <DataField label="Name" value={item.name} onCopy={handleCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-name`} fieldKey={`${cardKey}-name`} />
                        <DataField label="Email" value={item.email} onCopy={handleCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-email`} fieldKey={`${cardKey}-email`} />
                        <DataField label="Tel." value={item.tel} onCopy={handleCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-tel`} fieldKey={`${cardKey}-tel`} />
                        <DataField label="Erstellt am" value={formatDate(item.erstelltam)} onCopy={handleCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-erstelltam`} fieldKey={`${cardKey}-erstelltam`} copyValue={item.erstelltam}/>
                        {isBeschwerde && beschwerdeItem && ( <>
                                <DataField label="Status" value={beschwerdeItem.status} onCopy={handleCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-status`} fieldKey={`${cardKey}-status`}/>
                                <DataField label="Beschwerdegrund" value={beschwerdeItem.beschwerdegrund} onCopy={handleCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-grund`} fieldKey={`${cardKey}-grund`} />
                                <DataField label="Vorfalldatum" value={formatDate(beschwerdeItem.datum)} onCopy={handleCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-vdatum`} fieldKey={`${cardKey}-vdatum`} copyValue={beschwerdeItem.datum}/>
                                <DataField label="Vorfallzeit" value={formatTime(beschwerdeItem.uhrzeit)} onCopy={handleCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-vzeit`} fieldKey={`${cardKey}-vzeit`} copyValue={beschwerdeItem.uhrzeit}/>
                                <DataField label="Linie" value={beschwerdeItem.linie} onCopy={handleCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-linie`} fieldKey={`${cardKey}-linie`} />
                                <DataField label="Haltestelle" value={beschwerdeItem.haltestelle} onCopy={handleCopyToClipboard} isCopied={copiedCellKey === `${cardKey}-hst`} fieldKey={`${cardKey}-hst`} />
                            </> )}
                    </div>
                     <div className="mt-2 py-1.5"> <span className="text-xs text-slate-400 block">Beschreibung</span> <p className="text-slate-100 text-xs whitespace-pre-wrap break-words max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50 pr-1"> {item.beschreibung} </p> </div>
                </div>
                {isBeschwerde && actionButton && ( <div className="mt-auto pt-3"> {actionButton} </div> )}
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen w-full bg-[#0D0D12] text-white font-sans">
            {/* Statusleiste - Kandidat für Auslagerung in StatusBar.tsx */}
            <div className="fixed top-0 h-15 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md text-slate-300 text-xs px-4 shadow-md flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                        <Image
                            src="/logo.png" 
                            alt="Cottbusverkehr Logo"
                            width={125}  
                            height={24} 
                            priority     
                            className="object-contain"
                        />
                    </div>
                    <div className="flex items-center" title={isDbConnected ? "API Verbindung aktiv" : "API Verbindung unterbrochen"}>
                        <span className={`w-2.5 h-2.5 rounded-full inline-block mr-1.5 ${isDbConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                        <span className="hidden sm:inline">{isDbConnected ? "Online" : "Offline"}</span>
                    </div>
                    {lastDataUpdateTimestamp && (
                        <div className="hidden md:flex items-center text-slate-400" title={`Daten zuletzt abgerufen um ${formatLastUpdateTime(lastDataUpdateTimestamp)}`}>
                            <RefreshCwIcon size={12} className="mr-1.5 flex-shrink-0" />
                            <span className="hidden lg:inline">Letzte Aktual.: </span>
                            <span>{formatLastUpdateTime(lastDataUpdateTimestamp)}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-3">
                    <span className="hidden sm:inline">{currentDate}</span>
                    <span className="font-mono text-sm">{currentTime}</span>
                </div>
            </div>
            <div className="h-10"></div> {/* Spacer für fixed StatusBar */}

            <motion.div
                className="w-full max-w-none mt-10 p-4 md:p-8 mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                {/* Tab-Navigation - Kandidat für Auslagerung in ViewTabs.tsx */}
                <div className="mb-6 flex flex-wrap space-x-1 border-b border-[#20202A] pb-px">
                    {(Object.keys(VIEW_TITLES) as ViewType[]).map((viewKey) => (
                        <button
                            key={viewKey}
                            onClick={() => setCurrentView(viewKey)}
                            className={`px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500
                                ${currentView === viewKey
                                    ? 'border-b-2 border-blue-500 text-blue-400'
                                    : 'border-b-2 border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-500'
                                }`}
                        >
                            {VIEW_TITLES[viewKey].replace("übersicht", "")}
                        </button>
                    ))}
                </div>

                <h1 className="text-xl md:text-2xl font-semibold mb-2 text-neutral-200">
                    {VIEW_TITLES[currentView]}
                </h1>

                {/* Filter Bereich - Kandidat für Auslagerung in FilterControls.tsx */}
                <div className="my-6 space-y-4 md:space-y-0 md:flex md:flex-col p-3 bg-slate-800/60 backdrop-blur-lg rounded-2xl shadow-xl">
                    <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-4">
                        {currentView === "beschwerden" && (
                            <div className="p-1 bg-slate-700/50 backdrop-blur-sm rounded-full shadow-lg flex justify-center items-center relative max-w-md w-full md:w-auto">
                                {(Object.keys(FILTER_LABELS) as StatusFilterMode[]).map((filterKey) => (
                                    <button
                                        key={filterKey}
                                        onClick={() => setActiveStatusFilter(filterKey)}
                                        className={`relative flex-1 px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-opacity-75 whitespace-nowrap
                                            ${activeStatusFilter === filterKey ? 'text-green-50' : 'text-slate-300 hover:text-slate-100'}`}
                                    >
                                        <span className="relative z-10">{FILTER_LABELS[filterKey]}</span>
                                        {activeStatusFilter === filterKey && (
                                            <motion.div
                                                layoutId="activeFilterPillNeonGlass"
                                                className="absolute inset-0 bg-green-500/70 rounded-full shadow-[0_0_10px_1px_theme(colors.green.400),_0_0_15px_2px_theme(colors.green.500/0.3)] -z-0"
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Suchfelder könnten auch eigene Komponenten sein (z.B. SearchInput.tsx) */}
                        <div className="flex flex-col items-start w-full md:w-auto md:min-w-[180px]">
                            <label htmlFor="personSearch" className="text-xs font-medium text-slate-300 mb-1 ml-1">Person:</label>
                            <div className="relative w-full">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3"> <SearchIcon size={16} className="text-slate-400" /> </span>
                                <input type="text" id="personSearch" placeholder="Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full pl-10 pr-8 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full" style={{colorScheme: 'dark'}} />
                                {searchTerm && ( <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-200" title="Suche zurücksetzen" > <XIcon size={18} /> </button> )}
                            </div>
                        </div>
                         <div className="flex flex-col items-start w-full md:w-auto md:min-w-[180px]">
                            <label htmlFor="emailSearch" className="text-xs font-medium text-slate-300 mb-1 ml-1">E-Mail:</label>
                            <div className="relative w-full">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3"> <MailIcon size={16} className="text-slate-400" /> </span>
                                <input type="text" id="emailSearch" placeholder="E-Mail..." value={emailSearchTerm} onChange={(e) => setEmailSearchTerm(e.target.value)} className="bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full pl-10 pr-8 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full" style={{colorScheme: 'dark'}}/>
                                {emailSearchTerm && ( <button onClick={() => setEmailSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-200" title="E-Mail-Suche zurücksetzen" > <XIcon size={18} /> </button> )}
                            </div>
                        </div>
                        <div className="flex flex-col items-start w-full md:w-auto md:min-w-[150px]">
                            <label htmlFor="idSearch" className="text-xs font-medium text-slate-300 mb-1 ml-1">ID:</label>
                            <div className="relative w-full">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3"> <HashIcon size={16} className="text-slate-400" /> </span>
                                <input type="text" id="idSearch" placeholder="ID (Nr.)..." value={idSearchTerm} onChange={(e) => setIdSearchTerm(e.target.value.replace(/\D/g, ''))} className="bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full pl-10 pr-8 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full" style={{colorScheme: 'dark'}} />
                                {idSearchTerm && ( <button onClick={() => setIdSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-200" title="ID-Suche zurücksetzen" > <XIcon size={18} /> </button> )}
                            </div>
                        </div>
                        <div className="flex flex-col items-start self-end">
                             <button
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className="relative px-3 h-[38px] bg-slate-600 hover:bg-slate-500 text-white text-xs sm:text-sm font-semibold rounded-full transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 flex items-center gap-2 whitespace-nowrap"
                                title={showAdvancedFilters ? "Erweiterte Filter ausblenden" : "Erweiterte Filter anzeigen"}
                            >
                                <FilterIcon size={14} />
                                <span>{showAdvancedFilters ? "Weniger" : "Mehr"} Filter</span>
                                {isDateFilterApplied && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-800"></span>
                                )}
                            </button>
                        </div>
                    </div>

                    {showAdvancedFilters && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="flex flex-wrap items-end gap-x-3 gap-y-3 pt-4 border-t border-slate-700/50">
                                <div className="flex flex-col items-start">
                                    <label htmlFor="startDate" className="text-xs font-medium text-slate-300 mb-1 ml-1">Erstellt von:</label>
                                    <input type="date" id="startDate" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} className="bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full sm:w-auto" style={{colorScheme: 'dark'}}/>
                                </div>
                                <div className="flex flex-col items-start">
                                    <label htmlFor="endDate" className="text-xs font-medium text-slate-300 mb-1 ml-1">bis:</label>
                                    <input type="date" id="endDate" value={endDateInput} onChange={(e) => setEndDateInput(e.target.value)} min={startDateInput} className="bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full sm:w-auto" style={{colorScheme: 'dark'}}/>
                                </div>
                                <div className="flex gap-2 items-center pt-1 sm:pt-0">
                                    <button onClick={handleApplyDateFilter} className="px-3 h-[38px] bg-green-600 hover:bg-green-500 text-white text-xs sm:text-sm font-semibold rounded-full transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 whitespace-nowrap">
                                        Datum anw.
                                    </button>
                                    <button onClick={handleClearDateFilter} className="px-3 h-[38px] bg-slate-600 hover:bg-slate-500 text-white text-xs sm:text-sm font-semibold rounded-full transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 whitespace-nowrap" >
                                        Löschen
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {error && ( <div className="my-4 p-3 bg-red-700 text-white rounded-md shadow-lg" role="alert"> <p><strong>Fehler:</strong> {error}</p> </div> )}

                {/* Datenanzeige - Kandidat für Auslagerung in DataGrid.tsx oder DataList.tsx */}
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
                        {filteredData.map((item) => renderDataItemCard(item))}
                    </motion.div>
                ) : null}
            </motion.div>
        </div>
    );
}