// app/page.tsx

"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { XIcon, CopyIcon, CheckIcon } from "lucide-react"; // CopyIcon und CheckIcon für Kopierfunktion

// Definiere die Typen für deine Daten
interface BaseItem {
    id: number; 
    name: string;
    email: string; 
    tel?: string;   
    betreff: string;
    beschreibung: string;
    erstelltam: string; 
}

interface BeschwerdeItem extends BaseItem {
    beschwerdegrund: string; 
    datum: string; 
    uhrzeit: string;         
    haltestelle?: string;
    linie?: string;
    status?: "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt"; 
}

type LobItem = BaseItem; 
type AnregungItem = BaseItem; 
type DataItem = BeschwerdeItem | LobItem | AnregungItem; 
type ViewType = "beschwerden" | "lob" | "anregungen";

type StatusFilterMode = "alle" | "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";

const API_ENDPOINTS: Record<ViewType, string> = {
    beschwerden: "/api/containt", 
    lob: "/api/like",
    anregungen: "/api/feedback",
};

const VIEW_TITLES: Record<ViewType, string> = {
    beschwerden: "Beschwerdeübersicht",
    lob: "Lobübersicht",
    anregungen: "Anregungsübersicht",
};

const FILTER_LABELS: Record<StatusFilterMode, string> = {
    "alle": "Alle",
    "Offen": "Offen",
    "In Bearbeitung": "In Bearb.",
    "Gelöst": "Gelöst",
    "Abgelehnt": "Abgelehnt",
};

const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) throw new Error("Invalid date value");
        return date.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch (e) {
        console.error("Fehler beim Formatieren des Datums:", e, "Input:", dateString);
        return dateString; 
    }
};

const formatTime = (timeString?: string) => {
    if (!timeString || timeString.toLowerCase() === "invalid date") return "N/A"; 
    try {
        if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeString)) {
            return timeString.substring(0, 5); 
        }
        const date = new Date(`1970-01-01T${timeString}`); 
         if (isNaN(date.getTime())) { 
            const fullDate = new Date(timeString);
            if(isNaN(fullDate.getTime())) return timeString; 
            return fullDate.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        return date.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch (e) {
        console.error("Fehler beim Formatieren der Uhrzeit:", e, "Input:", timeString);
        return timeString;
    }
};


const getStatusColor = (status?: BeschwerdeItem["status"]) => {
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : undefined;
    switch (normalizedStatus) {
        case "offen": return "text-green-400";
        case "in bearbeitung": return "text-yellow-400";
        case "gelöst": return "text-blue-400";
        case "abgelehnt": return "text-red-400";
        default: return "text-neutral-400";
    }
};

// Hilfskomponente für ein einzelnes Datenfeld mit Kopierfunktion
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


export default function Home() {
    const [currentView, setCurrentView] = useState<ViewType>("beschwerden");
    const [data, setData] = useState<DataItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedCellKey, setCopiedCellKey] = useState<string | null>(null); 
    const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilterMode>("alle");
    const [startDateInput, setStartDateInput] = useState<string>(""); 
    const [endDateInput, setEndDateInput] = useState<string>("");   
    const [appliedStartDate, setAppliedStartDate] = useState<string | null>(null);
    const [appliedEndDate, setAppliedEndDate] = useState<string | null>(null);

    const fetchData = useCallback(async (view: ViewType, isBackgroundUpdate = false) => {
        if (!isBackgroundUpdate) { setIsLoading(true); setError(null); }
        try {
            const response = await fetch(API_ENDPOINTS[view]);
            if (!response.ok) { const errorText = await response.text(); throw new Error(`Fehler: Status ${response.status} - ${errorText.substring(0,100)}`); }
            const fetchedData: DataItem[] = await response.json();
            setData(fetchedData); 
            if (!isBackgroundUpdate) setError(null); 
        } catch (err) { console.error(`Ladefehler ${view}:`, err); setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
        } finally { if (!isBackgroundUpdate) setIsLoading(false); }
    }, []); 

    useEffect(() => {
        fetchData(currentView);
        setActiveStatusFilter("alle");
        setStartDateInput(""); setEndDateInput("");
        setAppliedStartDate(null); setAppliedEndDate(null);
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
    }, [data, currentView, activeStatusFilter, appliedStartDate, appliedEndDate]);

    const handleCopyToClipboard = async (textToCopy: string, cellKey: string) => { 
        if (!textToCopy) return;
        try { 
            await navigator.clipboard.writeText(textToCopy); 
            setCopiedCellKey(cellKey); 
            setTimeout(() => setCopiedCellKey(null), 1500); 
        }
        catch (err) { 
            console.error('Kopierfehler: ', err); 
            setError("Kopieren fehlgeschlagen."); 
            setTimeout(() => setError(null), 3000); 
        }
    };

    const handleStatusChange = async (itemId: number, newStatus: BeschwerdeItem["status"]) => {
        const originalData = [...data]; 
        setData(prevData => prevData.map(item => item.id === itemId && 'status' in item ? { ...item, status: newStatus } as BeschwerdeItem : item ));
        setError(null); 
        try {
            const response = await fetch(`${API_ENDPOINTS.beschwerden}/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify({ status: newStatus }), });
            if (!response.ok) { setData(originalData); const errorData = await response.json().catch(() => ({ details: response.statusText })); throw new Error(`Update fehlgeschlagen (${response.status}): ${errorData.details || errorData.error || "Serverfehler"}`); }
            fetchData(currentView, true);
        } catch (err) { console.error(`Statusänderungsfehler für Item ${itemId}:`, err); setData(originalData); setError(err instanceof Error ? err.message : "Statusupdate fehlgeschlagen."); setTimeout(() => setError(null), 5000); }
    };
    
    const handleApplyDateFilter = () => { setAppliedStartDate(startDateInput || null); setAppliedEndDate(endDateInput || null); };
    const handleClearDateFilter = () => { setStartDateInput(""); setEndDateInput(""); setAppliedStartDate(null); setAppliedEndDate(null); };

    const renderDataItemCard = (item: DataItem) => {
        // ... (renderDataItemCard Implementierung bleibt gleich)
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
        <div className="min-h-screen w-full bg-[#0D0D12] text-white p-4 md:p-8 font-sans">
            <motion.div
                className="w-full max-w-none p-2 sm:p-6 md:p-10 mx-auto" 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                {/* Tabs für Hauptansichten */}
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

                {/* Status-Filterleiste */}
                {currentView === "beschwerden" && (
                    <div className="my-6 p-1 bg-slate-800/60 backdrop-blur-lg rounded-full shadow-xl flex justify-center items-center relative max-w-2xl mx-auto"> 
                         {(Object.keys(FILTER_LABELS) as StatusFilterMode[]).map((filterKey) => (
                            <button
                                key={filterKey}
                                onClick={() => setActiveStatusFilter(filterKey)}
                                className={`relative flex-1 px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-opacity-75 whitespace-nowrap
                                    ${activeStatusFilter === filterKey 
                                        ? 'text-green-50' 
                                        : 'text-slate-300 hover:text-slate-100' 
                                    }`}
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

                {/* Datumsbereichsfilter-UI (Optimiertes Layout) */}
                <div className="my-6 p-2 bg-slate-800/60 backdrop-blur-lg rounded-2xl shadow-xl flex flex-wrap items-end justify-center gap-x-4 gap-y-3 max-w-xl mx-auto">
                    {/* Gruppe für "Von"-Datum */}
                    <div className="flex flex-col items-start">
                        <label htmlFor="startDate" className="text-xs font-medium text-slate-300 mb-1 ml-1">Erstellt von:</label>
                        <input 
                            type="date"
                            id="startDate"
                            value={startDateInput}
                            onChange={(e) => setStartDateInput(e.target.value)}
                            className="bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full"
                            style={{colorScheme: 'dark'}}
                        />
                    </div>
                    {/* Gruppe für "Bis"-Datum */}
                    <div className="flex flex-col items-start">
                        <label htmlFor="endDate" className="text-xs font-medium text-slate-300 mb-1 ml-1">bis:</label>
                        <input 
                            type="date"
                            id="endDate"
                            value={endDateInput}
                            onChange={(e) => setEndDateInput(e.target.value)}
                            min={startDateInput} 
                            className="bg-slate-700/50 text-slate-100 border border-slate-600 rounded-full px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none w-full"
                            style={{colorScheme: 'dark'}}
                        />
                    </div>
                    {/* Gruppe für Buttons */}
                    <div className="flex gap-2 items-center pt-1"> {/* pt-1 um mit der Höhe der Input-Labels besser auszurichten */}
                        <button
                            onClick={handleApplyDateFilter}
                            className="px-4 h-[38px] bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-full transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 whitespace-nowrap"
                        >
                            Anwenden
                        </button>
                        <button
                            onClick={handleClearDateFilter}
                            className="px-4 h-[38px] bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold rounded-full transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 whitespace-nowrap"
                        >
                            Löschen
                        </button>
                    </div>
                </div>


                {error && ( <div className="my-4 p-3 bg-red-700 text-white rounded-md shadow-lg" role="alert"> <p><strong>Fehler:</strong> {error}</p> </div> )}
                
                {isLoading && !error ? (  
                    <div className="text-center py-10 text-neutral-300">Lade Daten...</div> 
                ) : !isLoading && filteredData.length === 0 && !error ? ( 
                    <div className="text-center py-10 text-neutral-500"> Keine Einträge für &quot;{activeStatusFilter !== "alle" ? FILTER_LABELS[activeStatusFilter] : VIEW_TITLES[currentView]}&quot;{ (appliedStartDate || appliedEndDate) && " im gewählten Zeitraum" } gefunden. </div> 
                ) : !isLoading && filteredData.length > 0 && !error ? ( 
                    <motion.div 
                        layout 
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                    >
                        {filteredData.map((item) => renderDataItemCard(item))}
                    </motion.div>
                ) : null} 
            </motion.div>
        </div>
    );
}
